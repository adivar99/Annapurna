// Load environment variables FIRST, before requiring any modules that use them
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { ApolloServer } = require('apollo-server-express');
const { typeDefs, resolvers } = require('./graphql/schema');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const patientRoutes = require('./routes/patient');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctor');
const livekitRoutes = require('./routes/livekit');
const { initializeBuckets } = require('./lib/minio-client');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Apollo GraphQL Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Add authentication context here if needed
    return { req };
  },
  introspection: true,
  playground: true
});

async function startServer() {
  try {
    // Initialize MinIO buckets
    await initializeBuckets();

    await server.start();
    server.applyMiddleware({ app, path: '/graphql' });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer().catch(error => {
  console.error('Error starting server:', error);
  process.exit(1);
});
