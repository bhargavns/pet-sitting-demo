const request = require('supertest');
const {app, db} = require('../app');
const bcrypt = require('bcryptjs');

const loginAgent = async () => {
    const agent = request.agent(app);
    const response = await agent
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword'
        });
    return response;
  }

module.exports = loginAgent;