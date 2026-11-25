package hasura

// Ownership-lookup operations added by the migration. The Node server fetched
// whole rows (or crashed on undefined functions) before mutating; these exist
// so handlers can enforce ownership cheaply and explicitly.

const GetRecipeOwnerOp = `
    query GetRecipeOwner($id: uuid!) {
      recipes_by_pk(id: $id) {
        author_id
      }
    }
  `

const GetChatSessionOwnerOp = `
    query GetChatSessionOwner($id: uuid!) {
      chat_sessions_by_pk(id: $id) {
        user_id
      }
    }
  `
