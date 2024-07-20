CREATE TABLE APP_USER (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('freelancer', 'employer')),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE FREELANCER (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES APP_USER(id),
    bio TEXT NOT NULL,
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE EMPLOYER (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES APP_USER(id),
    budget INT CHECK (budget >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE PET (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES EMPLOYER(id),
    name VARCHAR(255) NOT NULL,
    pet_type VARCHAR(50) NOT NULL CHECK (pet_type IN ('dog', 'cat')),
    age INT NOT NULL CHECK (age >= 0 AND age <= 30),
    special_needs TEXT,
     FOREIGN KEY (owner_id) REFERENCES users(id)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE SKILL (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE FREELANCER_SKILL (
    freelancer_id INT NOT NULL REFERENCES FREELANCER(id),
    skill_id INT NOT NULL REFERENCES SKILL(id),
    PRIMARY KEY (freelancer_id, skill_id)
);

CREATE TABLE JOB_POST (
    id SERIAL PRIMARY KEY,
    employer_id INT NOT NULL REFERENCES EMPLOYER(id),
    title VARCHAR(255) NOT NULL,
    pet_id INT NOT NULL REFERENCES PET(id),
    description TEXT NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'assigned', 'completed')),
    hourly_rate DECIMAL(10, 2) NOT NULL CHECK (hourly_rate > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE JOB_ASSIGNMENT (
    job_id INT NOT NULL REFERENCES JOB_POST(id),
    freelancer_id INT NOT NULL REFERENCES FREELANCER(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('accepted', 'in_progress', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (job_id, freelancer_id)
);

CREATE TABLE REVIEW (
    id SERIAL PRIMARY KEY,
    job_id INT NOT NULL REFERENCES JOB_POST(id),
    reviewer_id INT NOT NULL REFERENCES EMPLOYER(id),
    reviewee_id INT NOT NULL REFERENCES FREELANCER(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE MESSAGE (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES APP_USER(id),
    recipient_id INT NOT NULL REFERENCES APP_USER(id),
    job_id INT REFERENCES JOB_POST(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_email ON APP_USER(email);
CREATE INDEX idx_job_post_date_start ON JOB_POST(date_start);
CREATE INDEX idx_job_post_status ON JOB_POST(status);
CREATE INDEX idx_message_recipient ON MESSAGE(recipient_id);