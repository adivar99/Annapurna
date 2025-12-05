const express = require('express');
const router = express.Router();
const { makeGraphQLRequest } = require('./auth/shared/graphql');
const { authenticateToken } = require('./auth/shared/jwt');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get available appointment slots for a specific date
router.get('/available-slots/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    // Parse the date and get day of week (0=Sunday, 1=Monday, etc.)
    const appointmentDate = new Date(date);
    
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    const dayOfWeek = appointmentDate.getDay();

    // Get all doctor appointment slots for this day of week
    const slotsQuery = `
      query GetAvailableSlots($dayOfWeek: Int!) {
        doctor_appointment_slots(where: {day_of_week: {_eq: $dayOfWeek}}) {
          id
          doctor_id
          start_time
          end_time
          slot_duration_minutes
          doctor {
            id
            user {
              name
            }
            speciality
          }
        }
      }
    `;

    const slotsResult = await makeGraphQLRequest(slotsQuery, { dayOfWeek });

    if (!slotsResult.data || !slotsResult.data.doctor_appointment_slots) {
      return res.json({ success: true, data: [] });
    }

    // Get existing appointments for this date
    const appointmentsQuery = `
      query GetExistingAppointments($startOfDay: timestamptz!, $endOfDay: timestamptz!) {
        appointments(where: {
          appointment_time: {
            _gte: $startOfDay,
            _lt: $endOfDay
          }
        }) {
          id
          appointment_time
          doctor_id
        }
      }
    `;

    // Create start and end of day timestamps in UTC
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const endOfDay = new Date(`${date}T23:59:59Z`);

    const appointmentsResult = await makeGraphQLRequest(appointmentsQuery, { 
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    const existingAppointments = appointmentsResult.data?.appointments || [];

    // Generate available time slots
    const availableSlots = [];
    
    for (const slot of slotsResult.data.doctor_appointment_slots) {
      const startTime = new Date(`1970-01-01T${slot.start_time}`);
      const endTime = new Date(`1970-01-01T${slot.end_time}`);
      const duration = slot.slot_duration_minutes || 30;

      // Generate time slots within the doctor's available hours
      let currentTime = new Date(startTime);
      
      while (currentTime < endTime) {
        const slotStartTime = new Date(currentTime);
        const slotEndTime = new Date(currentTime.getTime() + duration * 60000);

        // Check if this slot conflicts with existing appointments
        const slotTimeString = slotStartTime.toTimeString().slice(0, 5);
        
        const isBooked = existingAppointments.some(appointment => {
          const appointmentTime = new Date(appointment.appointment_time);
          const appointmentTimeString = appointmentTime.toISOString().slice(11, 16); // Get UTC time
          
          return appointment.doctor_id === slot.doctor_id && 
                 appointmentTimeString === slotTimeString;
        });

        if (!isBooked) {
          availableSlots.push({
            id: `${slot.doctor_id}-${slotStartTime.getHours()}-${slotStartTime.getMinutes()}`,
            doctor_id: slot.doctor_id,
            doctor_name: slot.doctor.user.name,
            doctor_speciality: slot.doctor.speciality,
            start_time: slotStartTime.toTimeString().slice(0, 5),
            end_time: slotEndTime.toTimeString().slice(0, 5),
            duration_minutes: duration,
            appointment_date: date
          });
        }

        // Move to next slot
        currentTime = new Date(slotEndTime);
      }
    }

    res.json({ success: true, data: availableSlots });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ message: 'Failed to get available slots' });
  }
});

// Book an appointment
router.post('/book', async (req, res) => {
  try {
    const { doctor_id, appointment_date, start_time, reason } = req.body;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    if (!doctor_id || !appointment_date || !start_time) {
      return res.status(400).json({ message: 'Missing required fields: doctor_id, appointment_date, start_time' });
    }

    // Create appointment datetime in UTC
    const appointmentDateTime = new Date(`${appointment_date}T${start_time}:00Z`);

    // Check if slot is still available (race condition protection)
    const checkQuery = `
      query CheckSlotAvailability($doctorId: uuid!, $appointmentTime: timestamptz!) {
        appointments(where: {
          doctor_id: {_eq: $doctorId},
          appointment_time: {_eq: $appointmentTime}
        }) {
          id
        }
      }
    `;

    const checkResult = await makeGraphQLRequest(checkQuery, {
      doctorId: doctor_id,
      appointmentTime: appointmentDateTime.toISOString()
    });

    if (checkResult.data?.appointments?.length > 0) {
      return res.status(409).json({ message: 'This time slot is no longer available' });
    }

    // Create the appointment
    const createMutation = `
      mutation CreateAppointment($patientId: uuid!, $doctorId: uuid!, $appointmentTime: timestamptz!) {
        insert_appointments_one(object: {
          patient_id: $patientId,
          doctor_id: $doctorId,
          appointment_time: $appointmentTime,
          status: "pending"
        }) {
          id
          patient_id
          doctor_id
          appointment_time
          status
          created_at
        }
      }
    `;

    const result = await makeGraphQLRequest(createMutation, {
      patientId,
      doctorId: doctor_id,
      appointmentTime: appointmentDateTime.toISOString()
    });

    res.json({ 
      success: true, 
      data: result.data.insert_appointments_one,
      message: 'Appointment booked successfully' 
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ message: 'Failed to book appointment' });
  }
});

// Get patient's appointments
router.get('/my-appointments', async (req, res) => {
  try {
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    const query = `
      query GetPatientAppointments($patientId: uuid!) {
        appointments(where: {patient_id: {_eq: $patientId}}, order_by: {appointment_time: asc}) {
          id
          appointment_time
          status
          doctor {
            id
            user {
              name
            }
            speciality
          }
        }
      }
    `;

    const result = await makeGraphQLRequest(query, { patientId });

    res.json({ 
      success: true, 
      data: result.data?.appointments || [] 
    });
  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({ message: 'Failed to get appointments' });
  }
});

// Cancel an appointment
router.put('/cancel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    // First verify the appointment belongs to this patient
    const checkQuery = `
      query VerifyAppointment($appointmentId: uuid!) {
        appointments_by_pk(id: $appointmentId) {
          id
          patient_id
          status
        }
      }
    `;

    const checkResult = await makeGraphQLRequest(checkQuery, { appointmentId: id });

    if (!checkResult.data?.appointments_by_pk) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (checkResult.data.appointments_by_pk.patient_id !== patientId) {
      return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
    }

    // Update the appointment status to cancelled
    const updateMutation = `
      mutation CancelAppointment($appointmentId: uuid!, $reason: String) {
        update_appointments_by_pk(
          pk_columns: {id: $appointmentId},
          _set: {
            status: "cancelled",
            cancellation_reason: $reason
          }
        ) {
          id
          status
          cancellation_reason
        }
      }
    `;

    const result = await makeGraphQLRequest(updateMutation, {
      appointmentId: id,
      reason: reason || null
    });

    res.json({ success: true, data: result.data.update_appointments_by_pk });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Failed to cancel appointment' });
  }
});

// Confirm a pending appointment
router.put('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    // Check if appointment exists and belongs to this doctor
    const checkQuery = `
      query CheckAppointment($appointmentId: uuid!) {
        appointments_by_pk(id: $appointmentId) {
          id
          doctor_id
          status
          appointment_time
        }
      }
    `;

    const checkResult = await makeGraphQLRequest(checkQuery, { appointmentId: id });
    const appointment = checkResult.data?.appointments_by_pk;

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctor_id !== doctorId) {
      return res.status(403).json({ message: 'Not authorized to confirm this appointment' });
    }

    // Can only confirm pending appointments
    if (appointment.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot confirm appointment with status: ${appointment.status}. Only pending appointments can be confirmed.` 
      });
    }

    // Update the appointment status to confirmed
    const updateMutation = `
      mutation ConfirmAppointment($appointmentId: uuid!) {
        update_appointments_by_pk(
          pk_columns: {id: $appointmentId},
          _set: {
            status: "confirmed"
          }
        ) {
          id
          status
          appointment_time
          updated_at
        }
      }
    `;

    const result = await makeGraphQLRequest(updateMutation, { appointmentId: id });

    res.json({ success: true, data: result.data.update_appointments_by_pk });
  } catch (error) {
    console.error('Confirm appointment error:', error);
    res.status(500).json({ message: 'Failed to confirm appointment' });
  }
});

// Get pending appointments for doctor
router.get('/pending', async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    const query = `
      query GetPendingAppointments($doctorId: uuid!) {
        appointments(
          where: {
            doctor_id: {_eq: $doctorId},
            status: {_eq: "pending"}
          },
          order_by: {appointment_time: asc}
        ) {
          id
          appointment_time
          status
          patient {
            id
            user {
              id
              name
              email
              phone
            }
            date_of_birth
            sex
          }
        }
      }
    `;

    const result = await makeGraphQLRequest(query, { doctorId });

    res.json({ 
      success: true, 
      data: result.data?.appointments || [] 
    });
  } catch (error) {
    console.error('Get pending appointments error:', error);
    res.status(500).json({ message: 'Failed to get pending appointments' });
  }
});

// Cancel appointment (for doctors)
router.put('/doctor/cancel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    // Check if appointment exists and belongs to this doctor
    const checkQuery = `
      query CheckAppointment($appointmentId: uuid!) {
        appointments_by_pk(id: $appointmentId) {
          id
          doctor_id
          status
        }
      }
    `;

    const checkResult = await makeGraphQLRequest(checkQuery, { appointmentId: id });
    const appointment = checkResult.data?.appointments_by_pk;

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctor_id !== doctorId) {
      return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
    }

    // Can only cancel pending or confirmed appointments
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ 
        message: `Cannot cancel appointment with status: ${appointment.status}` 
      });
    }

    // Update the appointment status to cancelled
    const updateMutation = `
      mutation CancelAppointment($appointmentId: uuid!, $reason: String) {
        update_appointments_by_pk(
          pk_columns: {id: $appointmentId},
          _set: {
            status: "cancelled",
            cancellation_reason: $reason
          }
        ) {
          id
          status
          cancellation_reason
        }
      }
    `;

    const result = await makeGraphQLRequest(updateMutation, {
      appointmentId: id,
      reason: reason || null
    });

    res.json({ success: true, data: result.data.update_appointments_by_pk });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Failed to cancel appointment' });
  }
});

// Reschedule an appointment
router.put('/reschedule/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date, start_time } = req.body;
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID not found in token' });
    }

    if (!appointment_date || !start_time) {
      return res.status(400).json({ message: 'Missing required fields: appointment_date, start_time' });
    }

    // First verify the appointment belongs to this patient
    const checkQuery = `
      query VerifyAppointment($appointmentId: uuid!) {
        appointments_by_pk(id: $appointmentId) {
          id
          patient_id
          doctor_id
          status
        }
      }
    `;

    const checkResult = await makeGraphQLRequest(checkQuery, { appointmentId: id });

    if (!checkResult.data?.appointments_by_pk) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (checkResult.data.appointments_by_pk.patient_id !== patientId) {
      return res.status(403).json({ message: 'Not authorized to reschedule this appointment' });
    }

    // Can only reschedule pending or confirmed appointments
    if (!['pending', 'confirmed'].includes(checkResult.data.appointments_by_pk.status)) {
      return res.status(400).json({ message: 'Can only reschedule pending or confirmed appointments' });
    }

    // Create new appointment datetime in UTC
    const appointmentDateTime = new Date(`${appointment_date}T${start_time}:00Z`);

    // Check if new slot is available
    const checkSlotQuery = `
      query CheckSlotAvailability($doctorId: uuid!, $appointmentTime: timestamptz!) {
        appointments(where: {
          doctor_id: {_eq: $doctorId},
          appointment_time: {_eq: $appointmentTime}
        }) {
          id
        }
      }
    `;

    const checkSlotResult = await makeGraphQLRequest(checkSlotQuery, {
      doctorId: checkResult.data.appointments_by_pk.doctor_id,
      appointmentTime: appointmentDateTime.toISOString()
    });

    if (checkSlotResult.data?.appointments?.length > 0) {
      return res.status(409).json({ message: 'This time slot is no longer available' });
    }

    // Update the appointment
    const updateMutation = `
      mutation RescheduleAppointment($appointmentId: uuid!, $newAppointmentTime: timestamptz!) {
        update_appointments_by_pk(
          pk_columns: {id: $appointmentId},
          _set: {
            appointment_time: $newAppointmentTime,
            status: "pending"
          }
        ) {
          id
          appointment_time
          status
        }
      }
    `;

    const result = await makeGraphQLRequest(updateMutation, {
      appointmentId: id,
      newAppointmentTime: appointmentDateTime.toISOString()
    });

    res.json({ success: true, data: result.data.update_appointments_by_pk });
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({ message: 'Failed to reschedule appointment' });
  }
});

// Get doctor's appointments scheduled today
router.get('/doctor/today', async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfDay = tomorrow.toISOString();

    const query = `
      query GetTodayAppointments($doctorId: uuid!, $startOfDay: timestamptz!, $endOfDay: timestamptz!) {
        appointments(
          where: {
            doctor_id: {_eq: $doctorId},
            appointment_time: {_gte: $startOfDay, _lt: $endOfDay},
            status: {_nin: ["cancelled"]}
          },
          order_by: {appointment_time: asc}
        ) {
          id
          appointment_time
          status
          cancellation_reason
          patient {
            id
            user {
              id
              name
            }
            date_of_birth
            sex
          }
        }
      }
    `;

    const result = await makeGraphQLRequest(query, {
      doctorId,
      startOfDay,
      endOfDay
    });

    res.json({
      success: true,
      data: result.data?.appointments || []
    });
  } catch (error) {
    console.error('Get today appointments error:', error);
    res.status(500).json({ message: 'Failed to get today appointments' });
  }
});

// Get doctor's next appointment with patient details
router.get('/doctor/next', async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    // Get current time
    const now = new Date().toISOString();

    const query = `
      query GetNextAppointment($doctorId: uuid!, $now: timestamptz!) {
        appointments(
          where: {
            doctor_id: {_eq: $doctorId},
            appointment_time: {_gte: $now},
            status: {_nin: ["cancelled", "completed"]}
          },
          order_by: {appointment_time: asc},
          limit: 1
        ) {
          id
          appointment_time
          status
          cancellation_reason
          patient {
            id
            user {
              id
              name
            }
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
      }
    `;

    const result = await makeGraphQLRequest(query, {
      doctorId,
      now
    });

    const nextAppointment = result.data?.appointments?.[0] || null;

    res.json({
      success: true,
      data: nextAppointment
    });
  } catch (error) {
    console.error('Get next appointment error:', error);
    res.status(500).json({ message: 'Failed to get next appointment' });
  }
});

// Get patient summary data for doctor
router.get('/doctor/patient/:patientId', async (req, res) => {
  try {
    const doctorId = req.user.doctor_id;
    const { patientId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found in token' });
    }

    // Verify doctor has access to this patient (has appointments)
    const accessQuery = `
      query CheckDoctorAccess($doctorId: uuid!, $patientId: uuid!) {
        appointments(
          where: {
            doctor_id: {_eq: $doctorId},
            patient_id: {_eq: $patientId}
          },
          limit: 1
        ) {
          id
        }
      }
    `;

    const accessResult = await makeGraphQLRequest(accessQuery, { doctorId, patientId });
    
    if (!accessResult.data?.appointments || accessResult.data.appointments.length === 0) {
      return res.status(403).json({ message: 'Access denied. No appointments found with this patient.' });
    }

    // Get comprehensive patient data
    const query = `
      query GetPatientSummary($patientId: uuid!) {
        patients_by_pk(id: $patientId) {
          id
          user_id
          date_of_birth
          sex
          user {
            id
            name
            email
            phone
          }
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
        appointments(where: {patient_id: {_eq: $patientId}}, order_by: {appointment_time: desc}) {
          id
          appointment_time
          status
          cancellation_reason
          doctor {
            id
            user {
              name
            }
            speciality
          }
        }
        patient_files(where: {patient_id: {_eq: $patientId}}) {
          id
          file_name
          uploaded_at
          file_type {
            name
          }
        }
        chat_sessions(where: {patient_id: {_eq: $patientId}}, order_by: {created_at: desc}) {
          id
          created_at
          chat_messages(order_by: {created_at: asc}) {
            id
            speaker
            message
            created_at
          }
          ai_generated_summary {
            id
            summary_text
            created_at
          }
          final_summary {
            id
            summary_data
            is_patient_verified
            created_at
          }
          patient_questions_for_doctors {
            id
            question_text
            created_at
          }
        }
        ai_generated_summaries(where: {patient_id: {_eq: $patientId}}, order_by: {created_at: desc}) {
          id
          session_id
          summary_text
          created_at
        }
        final_summaries(where: {patient_id: {_eq: $patientId}}, order_by: {created_at: desc}) {
          id
          session_id
          summary_data
          is_patient_verified
          created_at
        }
        patient_questions_for_doctor(where: {patient_id: {_eq: $patientId}}, order_by: {created_at: desc}) {
          id
          session_id
          question_text
          created_at
        }
      }
    `;

    const result = await makeGraphQLRequest(query, { patientId });

    // Flatten chat messages from chat_sessions
    const chats = (result.data?.chat_sessions || []).flatMap((session) => 
      (session.chat_messages || []).map((msg) => ({
        ...msg,
        session_id: session.id
      }))
    );

    // Extract summaries and questions from chat_sessions
    const aiSummariesFromSessions = (result.data?.chat_sessions || [])
      .filter(session => session.ai_generated_summary)
      .map(session => ({
        ...session.ai_generated_summary,
        session_id: session.id
      }));
    
    const finalSummariesFromSessions = (result.data?.chat_sessions || [])
      .filter(session => session.final_summary)
      .map(session => ({
        ...session.final_summary,
        session_id: session.id
      }));
    
    const questionsFromSessions = (result.data?.chat_sessions || [])
      .flatMap(session => (session.patient_questions_for_doctors || []).map(q => ({
        ...q,
        session_id: session.id
      })));

    // Combine summaries from direct queries and sessions
    const allAiSummaries = [
      ...(result.data?.ai_generated_summaries || []),
      ...aiSummariesFromSessions
    ];
    
    const allFinalSummaries = [
      ...(result.data?.final_summaries || []),
      ...finalSummariesFromSessions
    ];
    
    const allPatientQuestions = [
      ...(result.data?.patient_questions_for_doctor || []),
      ...questionsFromSessions
    ];

    res.json({
      success: true,
      data: {
        patient: result.data?.patients_by_pk || null,
        appointments: result.data?.appointments || [],
        files: result.data?.patient_files || [],
        chats: chats,
        chat_sessions: result.data?.chat_sessions || [],
        ai_summaries: allAiSummaries,
        final_summaries: allFinalSummaries,
        patient_questions: allPatientQuestions
      }
    });
  } catch (error) {
    console.error('Get patient summary error:', error);
    res.status(500).json({ message: 'Failed to get patient summary' });
  }
});

module.exports = router;
