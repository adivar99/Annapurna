const axios = require('axios');

const HASURA_ENDPOINT = `http://localhost:8080/v1/graphql` || process.env.HASURA_ENDPOINT || 'http://graphql-engine:8080/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'myadminsecretkey';

/**
 * Helper function to make GraphQL requests to Hasura
 * @param {string} query - GraphQL query string
 * @param {object} variables - Query variables
 * @returns {Promise<object>} GraphQL response data
 */
async function makeGraphQLRequest(query, variables = {}) {
  try {
    const response = await axios.post(HASURA_ENDPOINT, {
      query,
      variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      }
    });
    
    // Check for GraphQL errors in the response
    if (response.data.errors) {
      console.error('GraphQL errors:', JSON.stringify(response.data.errors, null, 2));
      throw new Error(response.data.errors[0].message || 'GraphQL query failed');
    }
    
    return response.data;
  } catch (error) {
    console.error('GraphQL request failed:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  makeGraphQLRequest
};

