const express = require('express');
const router = express.Router();
const { makeGraphQLRequest } = require('./auth/shared/graphql');
const { authenticateToken } = require('./auth/shared/jwt');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get intake questions for a doctor (for patients with active appointments)
router.get('/intake-questions/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    // Verify patient has an active appointment with this doctor
    const appointmentQuery = `
      query CheckActiveAppointment($patientId: uuid!, $doctorId: uuid!) {
        appointments(
          where: {
            patient_id: {_eq: $patientId},
            doctor_id: {_eq: $doctorId},
            status: {_in: ["pending", "confirmed"]}
          },
          limit: 1
        ) {
          id
          status
        }
      }
    `;

    const appointmentCheck = await makeGraphQLRequest(appointmentQuery, { patientId, doctorId });

    if (!appointmentCheck.data?.appointments || appointmentCheck.data.appointments.length === 0) {
      return res.status(403).json({ message: 'No active appointment found with this doctor' });
    }

    // Get active intake questions for this doctor, ordered by display_order
    const questionsQuery = `
      query GetIntakeQuestions($doctorId: uuid!) {
        intake_questions(
          where: {
            doctor_id: {_eq: $doctorId},
            is_active: {_eq: true}
          },
          order_by: [{display_order: asc_nulls_last}, {history_type: asc}]
        ) {
          id
          doctor_id
          history_type
          question_text
          display_order
          is_active
        }
      }
    `;

    const result = await makeGraphQLRequest(questionsQuery, { doctorId });

    res.json({ success: true, data: result.data?.intake_questions || [] });
  } catch (error) {
    console.error('Get intake questions error:', error);
    res.status(500).json({ message: 'Failed to get intake questions', error: error.message });
  }
});

// Get patient questionnaire responses for an appointment
router.get('/intake-question-responses/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    // Verify appointment belongs to patient
    const appointmentQuery = `
      query CheckAppointment($appointmentId: uuid!) {
        appointments_by_pk(id: $appointmentId) {
          id
          patient_id
        }
      }
    `;

    const appointmentCheck = await makeGraphQLRequest(appointmentQuery, { appointmentId });
    const appointment = appointmentCheck.data?.appointments_by_pk;

    if (!appointment || appointment.patient_id !== patientId) {
      return res.status(403).json({ message: 'Appointment not found or does not belong to patient' });
    }

    // Get patient questionnaire responses for this appointment
    const responsesQuery = `
      query GetPatientQuestionnaireResponses($appointmentId: uuid!) {
        patient_questionnaire_responses(
          where: {appointment_id: {_eq: $appointmentId}},
          order_by: {created_at: asc}
        ) {
          id
          patient_id
          question_id
          answer
          appointment_id
          created_at
        }
      }
    `;

    const result = await makeGraphQLRequest(responsesQuery, { appointmentId });

    res.json({ success: true, data: result.data?.patient_questionnaire_responses || [] });
  } catch (error) {
    console.error('Get intake responses error:', error);
    res.status(500).json({ message: 'Failed to get intake responses', error: error.message });
  }
});

// Save patient responses to intake questions
router.post('/intake-question-responses', async (req, res) => {
  try {
    const { appointment_id, responses } = req.body; // responses: [{ intake_question_id, answer }]
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ message: 'Invalid responses array' });
    }

    if (!appointment_id) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    // Verify appointment belongs to patient
    const appointmentQuery = `
      query CheckAppointment($appointmentId: uuid!) {
        appointments_by_pk(id: $appointmentId) {
          id
          patient_id
          status
        }
      }
    `;

    const appointmentCheck = await makeGraphQLRequest(appointmentQuery, { appointmentId: appointment_id });

    const appointment = appointmentCheck.data?.appointments_by_pk;
    if (!appointment || appointment.patient_id !== patientId) {
      return res.status(403).json({ message: 'Appointment not found or does not belong to patient' });
    }

    // First, get existing responses for this appointment
    const existingResponsesQuery = `
      query GetExistingResponses($appointmentId: uuid!, $patientId: uuid!) {
        patient_questionnaire_responses(
          where: {
            appointment_id: {_eq: $appointmentId},
            patient_id: {_eq: $patientId}
          }
        ) {
          id
          question_id
          answer
        }
      }
    `;

    const existingResponsesResult = await makeGraphQLRequest(existingResponsesQuery, { 
      appointmentId: appointment_id, 
      patientId 
    });
    const existingResponses = existingResponsesResult.data?.patient_questionnaire_responses || [];

    // Separate responses into updates and inserts
    const responsesToUpdate = [];
    const responsesToInsert = [];

    responses.forEach(({ intake_question_id, answer }) => {
      const existing = existingResponses.find(
        (r) => r.question_id === intake_question_id
      );

      if (existing) {
        // Update existing response if answer changed
        if (existing.answer !== answer) {
          responsesToUpdate.push({ id: existing.id, answer });
        }
      } else {
        // Insert new response
        responsesToInsert.push({
          patient_id: patientId,
          question_id: intake_question_id,
          answer: answer,
          appointment_id: appointment_id
        });
      }
    });

    // Perform updates
    if (responsesToUpdate.length > 0) {
      for (const update of responsesToUpdate) {
        const updateMutation = `
          mutation UpdatePatientQuestionnaireResponse($id: uuid!, $answer: String!) {
            update_patient_questionnaire_responses_by_pk(
              pk_columns: {id: $id},
              _set: {answer: $answer}
            ) {
              id
              answer
            }
          }
        `;
        await makeGraphQLRequest(updateMutation, { id: update.id, answer: update.answer });
      }
    }

    // Perform inserts
    if (responsesToInsert.length > 0) {
      const insertMutation = `
        mutation InsertPatientQuestionnaireResponses($responseObjects: [patient_questionnaire_responses_insert_input!]!) {
          insert_patient_questionnaire_responses(objects: $responseObjects) {
            affected_rows
            returning {
              id
              patient_id
              question_id
              answer
              appointment_id
              created_at
            }
          }
        }
      `;
      await makeGraphQLRequest(insertMutation, { responseObjects: responsesToInsert });
    }

    res.json({ success: true, message: 'Responses saved successfully' });
  } catch (error) {
    console.error('Save intake question responses error:', error);
    res.status(500).json({ message: 'Failed to save responses', error: error.message });
  }
});

// Update medical history
router.post('/medical-history', async (req, res) => {
  try {
    const { condition, diagnosis_date, notes } = req.body;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation CreateMedicalHistory($patientId: uuid!, $condition: String!, $diagnosis_date: date, $notes: String) {
        insert_medical_history_one(object: {
          patient_id: $patientId,
          condition: $condition,
          diagnosis_date: $diagnosis_date,
          notes: $notes
        }) {
          id
          condition
          diagnosis_date
          notes
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      patientId,
      condition,
      diagnosis_date: diagnosis_date || null,
      notes: notes || null
    });

    res.json({ success: true, data: result.data.insert_medical_history_one });
  } catch (error) {
    console.error('Medical history update error:', error);
    res.status(500).json({ message: 'Failed to update medical history' });
  }
});

// Update existing medical history
router.put('/medical-history/:id', async (req, res) => {
  try {
    const { condition, diagnosis_date, notes } = req.body;
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation UpdateMedicalHistory($id: uuid!, $condition: String!, $diagnosis_date: date, $notes: String) {
        update_medical_history_by_pk(pk_columns: {id: $id}, _set: {
          condition: $condition,
          diagnosis_date: $diagnosis_date,
          notes: $notes
        }) {
          id
          condition
          diagnosis_date
          notes
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      id,
      condition,
      diagnosis_date: diagnosis_date || null,
      notes: notes || null
    });

    res.json({ success: true, data: result.data.update_medical_history_by_pk });
  } catch (error) {
    console.error('Medical history update error:', error);
    res.status(500).json({ message: 'Failed to update medical history', error: error.message });
  }
});

// Delete medical history
router.delete('/medical-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation DeleteMedicalHistory($id: uuid!) {
        delete_medical_history_by_pk(id: $id) {
          id
        }
      }
    `;

    await makeGraphQLRequest(mutation, { id });

    res.json({ success: true });
  } catch (error) {
    console.error('Medical history delete error:', error);
    res.status(500).json({ message: 'Failed to delete medical history', error: error.message });
  }
});

// Create surgical history
router.post('/surgical-history', async (req, res) => {
  try {
    const { procedure_name, procedure_date, notes } = req.body;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation CreateSurgicalHistory($patientId: uuid!, $procedure_name: String!, $procedure_date: date, $notes: String) {
        insert_surgical_history_one(object: {
          patient_id: $patientId,
          procedure_name: $procedure_name,
          procedure_date: $procedure_date,
          notes: $notes
        }) {
          id
          procedure_name
          procedure_date
          notes
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      patientId,
      procedure_name,
      procedure_date: procedure_date || null,
      notes: notes || null
    });

    res.json({ success: true, data: result.data.insert_surgical_history_one });
  } catch (error) {
    console.error('Surgical history create error:', error);
    res.status(500).json({ message: 'Failed to create surgical history' });
  }
});

// Update existing surgical history
router.put('/surgical-history/:id', async (req, res) => {
  try {
    const { procedure_name, procedure_date, notes } = req.body;
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation UpdateSurgicalHistory($id: uuid!, $procedure_name: String!, $procedure_date: date, $notes: String) {
        update_surgical_history_by_pk(pk_columns: {id: $id}, _set: {
          procedure_name: $procedure_name,
          procedure_date: $procedure_date,
          notes: $notes
        }) {
          id
          procedure_name
          procedure_date
          notes
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      id,
      procedure_name,
      procedure_date: procedure_date || null,
      notes: notes || null
    });

    res.json({ success: true, data: result.data.update_surgical_history_by_pk });
  } catch (error) {
    console.error('Surgical history update error:', error);
    res.status(500).json({ message: 'Failed to update surgical history', error: error.message });
  }
});

// Delete surgical history
router.delete('/surgical-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation DeleteSurgicalHistory($id: uuid!) {
        delete_surgical_history_by_pk(id: $id) {
          id
        }
      }
    `;

    await makeGraphQLRequest(mutation, { id });

    res.json({ success: true });
  } catch (error) {
    console.error('Surgical history delete error:', error);
    res.status(500).json({ message: 'Failed to delete surgical history', error: error.message });
  }
});

// Create medications
router.post('/medications', async (req, res) => {
  try {
    const { medication_name, dosage, frequency, notes } = req.body;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation CreateMedication($patientId: uuid!, $medication_name: String!, $dosage: String, $frequency: String, $notes: String) {
        insert_medications_one(object: {
          patient_id: $patientId,
          medication_name: $medication_name,
          dosage: $dosage,
          frequency: $frequency,
          notes: $notes
        }) {
          id
          medication_name
          dosage
          frequency
          notes
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      patientId,
      medication_name,
      dosage: dosage || null,
      frequency: frequency || null,
      notes: notes || null
    });

    res.json({ success: true, data: result.data.insert_medications_one });
  } catch (error) {
    console.error('Medications create error:', error);
    res.status(500).json({ message: 'Failed to create medication' });
  }
});

// Update existing medications
router.put('/medications/:id', async (req, res) => {
  try {
    const { medication_name, dosage, frequency, notes } = req.body;
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation UpdateMedication($id: uuid!, $medication_name: String!, $dosage: String, $frequency: String, $notes: String) {
        update_medications_by_pk(pk_columns: {id: $id}, _set: {
          medication_name: $medication_name,
          dosage: $dosage,
          frequency: $frequency,
          notes: $notes
        }) {
          id
          medication_name
          dosage
          frequency
          notes
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      id,
      medication_name,
      dosage: dosage || null,
      frequency: frequency || null,
      notes: notes || null
    });

    res.json({ success: true, data: result.data.update_medications_by_pk });
  } catch (error) {
    console.error('Medications update error:', error);
    res.status(500).json({ message: 'Failed to update medication', error: error.message });
  }
});

// Delete medications
router.delete('/medications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation DeleteMedication($id: uuid!) {
        delete_medications_by_pk(id: $id) {
          id
        }
      }
    `;

    await makeGraphQLRequest(mutation, { id });

    res.json({ success: true });
  } catch (error) {
    console.error('Medications delete error:', error);
    res.status(500).json({ message: 'Failed to delete medication', error: error.message });
  }
});

// Create allergies
router.post('/allergies', async (req, res) => {
  try {
    const { allergen, reaction } = req.body;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation CreateAllergy($patientId: uuid!, $allergen: String!, $reaction: String) {
        insert_allergies_one(object: {
          patient_id: $patientId,
          allergen: $allergen,
          reaction: $reaction
        }) {
          id
          allergen
          reaction
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      patientId,
      allergen,
      reaction: reaction || null
    });

    res.json({ success: true, data: result.data.insert_allergies_one });
  } catch (error) {
    console.error('Allergies create error:', error);
    res.status(500).json({ message: 'Failed to create allergy' });
  }
});

// Update existing allergies
router.put('/allergies/:id', async (req, res) => {
  try {
    const { allergen, reaction } = req.body;
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation UpdateAllergy($id: uuid!, $allergen: String!, $reaction: String) {
        update_allergies_by_pk(pk_columns: {id: $id}, _set: {
          allergen: $allergen,
          reaction: $reaction
        }) {
          id
          allergen
          reaction
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      id,
      allergen,
      reaction: reaction || null
    });

    res.json({ success: true, data: result.data.update_allergies_by_pk });
  } catch (error) {
    console.error('Allergies update error:', error);
    res.status(500).json({ message: 'Failed to update allergy', error: error.message });
  }
});

// Delete allergies
router.delete('/allergies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation DeleteAllergy($id: uuid!) {
        delete_allergies_by_pk(id: $id) {
          id
        }
      }
    `;

    await makeGraphQLRequest(mutation, { id });

    res.json({ success: true });
  } catch (error) {
    console.error('Allergies delete error:', error);
    res.status(500).json({ message: 'Failed to delete allergy', error: error.message });
  }
});

// Create family history
router.post('/family-history', async (req, res) => {
  try {
    const { relative, condition, notes } = req.body;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation CreateFamilyHistory($patientId: uuid!, $relative: String!, $condition: String!, $notes: String) {
        insert_family_history_one(object: {
          patient_id: $patientId,
          relative: $relative,
          condition: $condition,
          notes: $notes
        }) {
          id
          relative
          condition
          notes
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      patientId,
      relative,
      condition,
      notes: notes || null
    });

    res.json({ success: true, data: result.data.insert_family_history_one });
  } catch (error) {
    console.error('Family history create error:', error);
    res.status(500).json({ message: 'Failed to create family history' });
  }
});

// Update existing family history
router.put('/family-history/:id', async (req, res) => {
  try {
    const { relative, condition, notes } = req.body;
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation UpdateFamilyHistory($id: uuid!, $relative: String!, $condition: String!, $notes: String) {
        update_family_history_by_pk(pk_columns: {id: $id}, _set: {
          relative: $relative,
          condition: $condition,
          notes: $notes
        }) {
          id
          relative
          condition
          notes
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      id,
      relative,
      condition,
      notes: notes || null
    });

    res.json({ success: true, data: result.data.update_family_history_by_pk });
  } catch (error) {
    console.error('Family history update error:', error);
    res.status(500).json({ message: 'Failed to update family history', error: error.message });
  }
});

// Delete family history
router.delete('/family-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation DeleteFamilyHistory($id: uuid!) {
        delete_family_history_by_pk(id: $id) {
          id
        }
      }
    `;

    await makeGraphQLRequest(mutation, { id });

    res.json({ success: true });
  } catch (error) {
    console.error('Family history delete error:', error);
    res.status(500).json({ message: 'Failed to delete family history', error: error.message });
  }
});

// Create functional history
router.post('/functional-history', async (req, res) => {
  try {
    const { history_type, question, answer } = req.body;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation CreateFunctionalHistory($patientId: uuid!, $history_type: history_type!, $question: String!, $answer: String!) {
        insert_functional_history_one(object: {
          patient_id: $patientId,
          history_type: $history_type,
          question: $question,
          answer: $answer
        }) {
          id
          history_type
          question
          answer
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      patientId,
      history_type,
      question,
      answer
    });

    res.json({ success: true, data: result.data.insert_functional_history_one });
  } catch (error) {
    console.error('Functional history create error:', error);
    res.status(500).json({ message: 'Failed to create functional history' });
  }
});

// Update existing functional history
router.put('/functional-history/:id', async (req, res) => {
  try {
    const { history_type, question, answer } = req.body;
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation UpdateFunctionalHistory($id: uuid!, $history_type: history_type!, $question: String!, $answer: String!) {
        update_functional_history_by_pk(pk_columns: {id: $id}, _set: {
          history_type: $history_type,
          question: $question,
          answer: $answer
        }) {
          id
          history_type
          question
          answer
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, {
      id,
      history_type,
      question,
      answer
    });

    res.json({ success: true, data: result.data.update_functional_history_by_pk });
  } catch (error) {
    console.error('Functional history update error:', error);
    res.status(500).json({ message: 'Failed to update functional history', error: error.message });
  }
});

// Delete functional history
router.delete('/functional-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const mutation = `
      mutation DeleteFunctionalHistory($id: uuid!) {
        delete_functional_history_by_pk(id: $id) {
          id
        }
      }
    `;

    await makeGraphQLRequest(mutation, { id });

    res.json({ success: true });
  } catch (error) {
    console.error('Functional history delete error:', error);
    res.status(500).json({ message: 'Failed to delete functional history', error: error.message });
  }
});

// Update basic patient info
router.put('/basic-info', async (req, res) => {
  try {
    const { name, date_of_birth, sex } = req.body;
    const patientId = req.user.patient_id;
    const userId = req.user.id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    // Update patient info
    const patientMutation = `
      mutation UpdatePatient($patientId: uuid!, $date_of_birth: date, $sex: sex) {
        update_patients_by_pk(pk_columns: {id: $patientId}, _set: {
          date_of_birth: $date_of_birth,
          sex: $sex
        }) {
          id
          date_of_birth
          sex
        }
      }
    `;

    const patientResult = await makeGraphQLRequest(patientMutation, {
      patientId,
      date_of_birth: date_of_birth || null,
      sex: sex ? sex.toLowerCase() : null
    });

    // Update user name if provided
    if (name && userId) {
      const userMutation = `
        mutation UpdateUser($userId: uuid!, $name: String!) {
          update_users_by_pk(pk_columns: {id: $userId}, _set: {
            name: $name
          }) {
            id
            name
          }
        }
      `;

      await makeGraphQLRequest(userMutation, {
        userId,
        name
      });
    }

    res.json({ success: true, data: patientResult.data.update_patients_by_pk });
  } catch (error) {
    console.error('Basic info update error:', error);
    res.status(500).json({ message: 'Failed to update basic info' });
  }
});

// Get fresh patient data
router.get('/data', async (req, res) => {
  try {
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const query = `
      query GetPatient($patientId: uuid!) {
        patients_by_pk(id: $patientId) {
          id
          user_id
          date_of_birth
          sex
          medical_histories {
            id
            condition
            diagnosis_date
            notes
          }
          surgical_histories {
            id
            procedure_name
            procedure_date
            notes
          }
          medications {
            id
            medication_name
            dosage
            frequency
            notes
          }
          allergies {
            id
            allergen
            reaction
          }
          family_histories {
            id
            relative
            condition
            notes
          }
          functional_histories {
            id
            history_type
            question
            answer
          }
        }
      }
    `;

    const result = await makeGraphQLRequest(query, { patientId });

    if (result.data && result.data.patients_by_pk) {
      res.json({ success: true, data: result.data.patients_by_pk });
    } else {
      res.status(404).json({ message: 'Patient not found' });
    }
  } catch (error) {
    console.error('Get patient data error:', error);
    res.status(500).json({ message: 'Failed to get patient data' });
  }
});

module.exports = router;
