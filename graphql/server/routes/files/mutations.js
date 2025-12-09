/**
 * GraphQL Mutation Strings for Files Module
 */

function Mutations() {
  const CREATE_PATIENT_FILE = `
    mutation CreatePatientFile($fileData: patient_files_insert_input!) {
      insert_patient_files_one(object: $fileData) {
        id
        file_name
        storage_path
        uploaded_at
        patient_id
        file_type_id
      }
    }
  `;

  const DELETE_PATIENT_FILE = `
    mutation DeletePatientFile($fileId: uuid!) {
      delete_patient_files_by_pk(id: $fileId) {
        id
        storage_path
      }
    }
  `;

  const CREATE_FILE_TYPE = `
    mutation CreateFileType($fileTypeData: file_types_insert_input!) {
      insert_file_types_one(object: $fileTypeData) {
        id
        name
      }
    }
  `;

  return {
    CREATE_PATIENT_FILE,
    DELETE_PATIENT_FILE,
    CREATE_FILE_TYPE
  };
}

module.exports = Mutations();
