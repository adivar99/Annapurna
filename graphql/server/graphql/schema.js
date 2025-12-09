const { gql } = require('graphql-tag');

// GraphQL Schema
const typeDefs = gql`
  type Session {
    token: String!
    user: User!
  }

  type User {
    id: ID!
    name: String
    email: String!
    username: String
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input SignupInput {
    name: String
    email: String!
    password: String!
    username: String
    imageUrl: String
  }

  type Query {
    # Add your queries here
    health: String
  }

  type Mutation {
    login(input: LoginInput!): Session!
    signup(input: SignupInput!): Session!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    health: () => 'OK'
  },
  Mutation: {
    login: async (_, { input }, { req }) => {
      // This will be handled by the REST API endpoint
      // This is here for the GraphQL schema definition
      throw new Error('Use the REST API endpoint /api/auth/login');
    },
    signup: async (_, { input }, { req }) => {
      // This will be handled by the REST API endpoint
      // This is here for the GraphQL schema definition
      throw new Error('Use the REST API endpoint /api/auth/signup');
    }
  }
};

module.exports = { typeDefs, resolvers };
