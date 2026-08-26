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
const recipeRoutes = require('./routes/recipes');
const chatRoutes = require('./routes/chat');
const aiRoutes = require('./routes/ai');
const { initializeBuckets } = require('./lib/minio-client');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auth & File routes (support both /api/* and /api/v1/* prefixes)
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/v1/files', fileRoutes);

// Recipe routes
app.use('/api/recipes', recipeRoutes);
app.use('/api/v1/recipes', recipeRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);
app.use('/api/v1/chat', chatRoutes);

// AI routes
app.use('/api/ai', aiRoutes);
app.use('/api/v1/ai', aiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Apollo GraphQL Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    return { req };
  },
  introspection: true,
  playground: true
});

async function startServer() {
  try {
    // Initialize MinIO buckets
    await initializeBuckets().catch(err => {
      console.warn('MinIO bucket initialization warning (MinIO might be unavailable in local standalone dev):', err.message);
    });

    await server.start();
    server.applyMiddleware({ app, path: '/graphql' });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth & /api/v1/auth`);
      console.log(`🍲 Recipe endpoints: http://localhost:${PORT}/api/v1/recipes`);
      console.log(`💬 Chat endpoints: http://localhost:${PORT}/api/v1/chat`);
      console.log(`🤖 AI endpoints: http://localhost:${PORT}/api/v1/ai`);
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
