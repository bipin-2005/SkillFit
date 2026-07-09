# SkillFit API

SkillFit API is a MERN-based backend application that provides secure authentication and user management services. It demonstrates industry-standard authentication practices, including JWT authentication, refresh token rotation, OTP verification, and secure RESTful API development using Node.js, Express.js, and MongoDB.

---

## Features

- User Registration & Login
- JWT Authentication
- Refresh Token Implementation
- OTP Verification
- Secure Password Hashing (bcrypt)
- Protected Routes
- RESTful API Architecture
- MongoDB Database Integration
- Modular Project Structure
- Centralized Error Handling
- Environment Variable Configuration

---

## Tech Stack

### Backend
- Node.js
- Express.js

### Database
- MongoDB
- Mongoose

### Authentication & Security
- JWT (JSON Web Token)
- Refresh Tokens
- bcrypt
- OTP Verification

### Tools
- Postman
- Git
- GitHub
- Nodemon

---

## Project Structure

```
SkillFit-api/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── app.js
│
├── server.js
├── package.json
├── .gitignore
└── README.md
```

---

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/bipin-2005/SkillFit.git
```

Navigate to the project directory.

```bash
cd SkillFit/SkillFit-api
```

Install dependencies.

```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the project root and add the following variables:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

REFRESH_TOKEN_SECRET=your_refresh_token_secret

EMAIL_USER=your_email

EMAIL_PASS=your_email_password
```

---

## Run the Application

Development Mode

```bash
npm run dev
```

Production Mode

```bash
npm start
```

The server will run on:

```
http://localhost:5000
```

---

## API Modules

- Authentication
- User Management
- OTP Verification
- Token Refresh
- Protected Routes

---

## Security Features

- JWT-based Authentication
- Refresh Token Rotation
- Password Hashing using bcrypt
- OTP Email Verification
- Environment Variable Protection
- Input Validation
- Error Handling Middleware

---

## Future Enhancements

- Google OAuth Login
- Role-Based Access Control (RBAC)
- Swagger API Documentation
- Rate Limiting
- Docker Support
- Unit & Integration Testing

---

## Author

**Bipin Rajak**

- GitHub: https://github.com/bipin-2005
- LinkedIn: https://www.linkedin.com/in/bipin-rajak/

---
