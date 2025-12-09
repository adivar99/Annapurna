/**
 * GraphQL Query Strings for Files Module
 */

function Queries() {
  const GET_FILE_BY_ID = `
    query GetFileById($fileId: uuid!) {
      patient_files_by_pk(id: $fileId) {
        id
        file_name
        storage_path
        metadata
        uploaded_at
        patient_id
        file_type_id
        file_type {
          name
        }
      }
    }
  `;

  const GET_PATIENT_FILES = `
    query GetPatientFiles($patientId: uuid!) {
      patient_files(where: {patient_id: {_eq: $patientId}}) {
        id
        file_name
        storage_path
        metadata
        uploaded_at
        file_type_id
        file_type {
          name
        }
      }
    }
  `;

  const GET_FILE_TYPES = `
    query GetFileTypes {
      file_types {
        id
        name
      }
    }
  `;

  return {
    GET_FILE_BY_ID,
    GET_PATIENT_FILES,
    GET_FILE_TYPES
  };
}

module.exports = Queries();
