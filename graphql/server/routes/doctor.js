const express = require('express');
const router = express.Router();
const { makeGraphQLRequest } = require('./auth/shared/graphql');
const { authenticateToken } = require('./auth/shared/jwt');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get doctor's personal information
router.get('/basic-info', async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    const query = `
      query GetDoctorInfo($doctorId: uuid!) {
        doctors_by_pk(id: $doctorId) {
          id
          speciality
          license_number
          license_year
          user {
            id
            name
            email
            phone
          }
        }
      }
    `;

    const result = await makeGraphQLRequest(query, { doctorId });

    if (!result.data || !result.data.doctors_by_pk) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ success: true, data: result.data.doctors_by_pk });
  } catch (error) {
    console.error('Get doctor info error:', error);
    res.status(500).json({ message: 'Failed to get doctor information', error: error.message });
  }
});

// Update doctor's personal information
router.put('/basic-info', async (req, res) => {
  try {
    const { name, email, phone, speciality, license_number, license_year } = req.body;
    const doctorId = req.user.doctor_id;
    const userId = req.user.id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    // Update user info if provided
    if (name || email || phone) {
      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (email) userUpdate.email = email;
      if (phone !== undefined) userUpdate.phone = phone;

      const userMutation = `
        mutation UpdateUser($userId: uuid!, $updates: users_set_input!) {
          update_users_by_pk(pk_columns: {id: $userId}, _set: $updates) {
            id
            name
            email
            phone
          }
        }
      `;

      await makeGraphQLRequest(userMutation, {
        userId,
        updates: userUpdate
      });
    }

    // Update doctor info if provided
    if (speciality || license_number || license_year !== undefined) {
      const doctorUpdate = {};
      if (speciality) doctorUpdate.speciality = speciality;
      if (license_number) doctorUpdate.license_number = license_number;
      if (license_year !== undefined) doctorUpdate.license_year = license_year;

      const doctorMutation = `
        mutation UpdateDoctor($doctorId: uuid!, $updates: doctors_set_input!) {
          update_doctors_by_pk(pk_columns: {id: $doctorId}, _set: $updates) {
            id
            speciality
            license_number
            license_year
          }
        }
      `;

      await makeGraphQLRequest(doctorMutation, {
        doctorId,
        updates: doctorUpdate
      });
    }

    res.json({ success: true, message: 'Doctor information updated successfully' });
  } catch (error) {
    console.error('Update doctor info error:', error);
    res.status(500).json({ message: 'Failed to update doctor information', error: error.message });
  }
});

// Get doctor's appointment slots
router.get('/appointment-slots', async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    const query = `
      query GetDoctorSlots($doctorId: uuid!) {
        doctor_appointment_slots(where: {doctor_id: {_eq: $doctorId}}, order_by: {day_of_week: asc, start_time: asc}) {
          id
          day_of_week
          start_time
          end_time
          slot_duration_minutes
        }
      }
    `;

    const result = await makeGraphQLRequest(query, { doctorId });

    res.json({ success: true, data: result.data?.doctor_appointment_slots || [] });
  } catch (error) {
    console.error('Get appointment slots error:', error);
    res.status(500).json({ message: 'Failed to get appointment slots', error: error.message });
  }
});

// Create appointment slot
router.post('/appointment-slots', async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, slot_duration_minutes } = req.body;
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    if (day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ message: 'Missing required fields: day_of_week, start_time, end_time' });
    }

    const mutation = `
      mutation CreateAppointmentSlot($slotData: doctor_appointment_slots_insert_input!) {
        insert_doctor_appointment_slots_one(object: $slotData) {
          id
          doctor_id
          day_of_week
          start_time
          end_time
          slot_duration_minutes
        }
      }
    `;

    const slotData = {
      doctor_id: doctorId,
      day_of_week: parseInt(day_of_week),
      start_time: start_time,
      end_time: end_time,
      slot_duration_minutes: slot_duration_minutes || 30
    };

    const result = await makeGraphQLRequest(mutation, { slotData });

    res.json({ success: true, data: result.data.insert_doctor_appointment_slots_one });
  } catch (error) {
    console.error('Create appointment slot error:', error);
    res.status(500).json({ message: 'Failed to create appointment slot', error: error.message });
  }
});

// Update appointment slot
router.put('/appointment-slots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { day_of_week, start_time, end_time, slot_duration_minutes } = req.body;
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    const updates = {};
    if (day_of_week !== undefined) updates.day_of_week = parseInt(day_of_week);
    if (start_time) updates.start_time = start_time;
    if (end_time) updates.end_time = end_time;
    if (slot_duration_minutes !== undefined) updates.slot_duration_minutes = slot_duration_minutes;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const mutation = `
      mutation UpdateAppointmentSlot($id: uuid!, $updates: doctor_appointment_slots_set_input!) {
        update_doctor_appointment_slots_by_pk(pk_columns: {id: $id}, _set: $updates) {
          id
          doctor_id
          day_of_week
          start_time
          end_time
          slot_duration_minutes
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, { id, updates });

    if (!result.data || !result.data.update_doctor_appointment_slots_by_pk) {
      return res.status(404).json({ message: 'Appointment slot not found' });
    }

    res.json({ success: true, data: result.data.update_doctor_appointment_slots_by_pk });
  } catch (error) {
    console.error('Update appointment slot error:', error);
    res.status(500).json({ message: 'Failed to update appointment slot', error: error.message });
  }
});

// Delete appointment slot
router.delete('/appointment-slots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    const mutation = `
      mutation DeleteAppointmentSlot($id: uuid!) {
        delete_doctor_appointment_slots_by_pk(id: $id) {
          id
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, { id });

    if (!result.data || !result.data.delete_doctor_appointment_slots_by_pk) {
      return res.status(404).json({ message: 'Appointment slot not found' });
    }

    res.json({ success: true, message: 'Appointment slot deleted successfully' });
  } catch (error) {
    console.error('Delete appointment slot error:', error);
    res.status(500).json({ message: 'Failed to delete appointment slot', error: error.message });
  }
});

// Get doctor's intake questions
router.get('/intake-questions', async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    const query = `
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

    const result = await makeGraphQLRequest(query, { doctorId });

    res.json({ success: true, data: result.data?.intake_questions || [] });
  } catch (error) {
    console.error('Get intake questions error:', error);
    res.status(500).json({ message: 'Failed to get intake questions', error: error.message });
  }
});

// Get patient questionnaire responses for an appointment
router.get('/appointments/:appointmentId/intake-responses', async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;
    const { appointmentId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    // Verify appointment belongs to doctor
    const appointmentQuery = `
      query CheckAppointment($appointmentId: uuid!) {
        appointments_by_pk(id: $appointmentId) {
          id
          doctor_id
          patient_id
        }
      }
    `;

    const appointmentCheck = await makeGraphQLRequest(appointmentQuery, { appointmentId });
    const appointment = appointmentCheck.data?.appointments_by_pk;

    if (!appointment || appointment.doctor_id !== doctorId) {
      return res.status(403).json({ message: 'Appointment not found or does not belong to doctor' });
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

// Create intake question
router.post('/intake-questions', async (req, res) => {
  try {
    const { history_type, question_text, display_order, is_active } = req.body;
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    if (!history_type || !question_text) {
      return res.status(400).json({ message: 'Missing required fields: history_type, question_text' });
    }

    const mutation = `
      mutation CreateIntakeQuestion($questionData: intake_questions_insert_input!) {
        insert_intake_questions_one(object: $questionData) {
          id
          doctor_id
          history_type
          question_text
          display_order
          is_active
        }
      }
    `;

    const questionData = {
      doctor_id: doctorId,
      history_type: history_type,
      question_text: question_text,
      display_order: display_order || null,
      is_active: is_active !== undefined ? is_active : true
    };

    const result = await makeGraphQLRequest(mutation, { questionData });

    res.json({ success: true, data: result.data.insert_intake_questions_one });
  } catch (error) {
    console.error('Create intake question error:', error);
    res.status(500).json({ message: 'Failed to create intake question', error: error.message });
  }
});

// Batch update intake questions order (MUST come before /:id route)
router.put('/intake-questions/order', async (req, res) => {
  try {
    const { questions } = req.body; // Array of { id, display_order }
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    if (!questions) {
      return res.status(400).json({ message: 'Missing questions array in request body' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Invalid questions array - must be a non-empty array' });
    }

    // Validate each question has required fields
    for (const question of questions) {
      if (!question.id) {
        return res.status(400).json({ 
          message: 'Invalid question format - each question must have id',
          received: question
        });
      }
      if (question.display_order === undefined || question.display_order === null) {
        return res.status(400).json({ 
          message: 'Invalid question format - each question must have display_order',
          received: question
        });
      }
    }

    // Update each question's display_order
    const updatePromises = questions.map(({ id, display_order }) => {
      const mutation = `
        mutation UpdateIntakeQuestionOrder($id: uuid!, $displayOrder: Int) {
          update_intake_questions_by_pk(
            pk_columns: {id: $id},
            _set: {display_order: $displayOrder}
          ) {
            id
            display_order
          }
        }
      `;
      return makeGraphQLRequest(mutation, { id, displayOrder: display_order });
    });

    await Promise.all(updatePromises);

    res.json({ success: true, message: 'Questions order updated successfully' });
  } catch (error) {
    console.error('Batch update questions order error:', error);
    res.status(500).json({ message: 'Failed to update questions order', error: error.message });
  }
});

// Update intake question
router.put('/intake-questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { history_type, question_text, display_order, is_active } = req.body;
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    const updates = {};
    if (history_type) updates.history_type = history_type;
    if (question_text) updates.question_text = question_text;
    if (display_order !== undefined) updates.display_order = display_order;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const mutation = `
      mutation UpdateIntakeQuestion($id: uuid!, $updates: intake_questions_set_input!) {
        update_intake_questions_by_pk(pk_columns: {id: $id}, _set: $updates) {
          id
          doctor_id
          history_type
          question_text
          display_order
          is_active
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, { id, updates });

    if (!result.data || !result.data.update_intake_questions_by_pk) {
      return res.status(404).json({ message: 'Intake question not found' });
    }

    res.json({ success: true, data: result.data.update_intake_questions_by_pk });
  } catch (error) {
    console.error('Update intake question error:', error);
    res.status(500).json({ message: 'Failed to update intake question', error: error.message });
  }
});

// Delete intake question
router.delete('/intake-questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    const mutation = `
      mutation DeleteIntakeQuestion($id: uuid!) {
        delete_intake_questions_by_pk(id: $id) {
          id
        }
      }
    `;

    const result = await makeGraphQLRequest(mutation, { id });

    if (!result.data || !result.data.delete_intake_questions_by_pk) {
      return res.status(404).json({ message: 'Intake question not found' });
    }

    res.json({ success: true, message: 'Intake question deleted successfully' });
  } catch (error) {
    console.error('Delete intake question error:', error);
    res.status(500).json({ message: 'Failed to delete intake question', error: error.message });
  }
});

module.exports = router;

