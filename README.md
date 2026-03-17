# PM Helpline — Citizen Grievance Portal

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Start MongoDB
```bash
# Make sure MongoDB is running locally on port 27017
mongod
```

### 3. Train the model (if not done already)
```bash
python train_model.py
```

### 4. Start the FastAPI server
```bash
uvicorn main:app --reload --port 8000
```

### 5. Open the portal
Open `login_portal.html`  in your browser (or serve it via any static file server).

---

## Database Collections (MongoDB: `pm_helpline`)

### `users` — stores registered citizens
| Field         | Type     | Description                        |
|---------------|----------|------------------------------------|
| full_name     | string   | Citizen's full name                |
| email         | string   | Unique email address               |
| phone         | string   | Mobile number                      |
| state         | string   | Indian state                       |
| aadhaar       | string   | Unique 12-digit Aadhaar number     |
| password_hash | string   | Bcrypt-hashed password             |
| created_at    | datetime | Registration timestamp             |
| is_active     | bool     | Account status                     |

### `complaints` — stores filed grievances
| Field        | Type   | Description                          |
|--------------|--------|--------------------------------------|
| user_email   | string | Links complaint to registered user   |
| name         | string | Citizen name (from user profile)     |
| state        | string | State (from user profile)            |
| aadhaar      | string | Aadhaar (from user profile)          |
| text         | string | Complaint text                       |
| file         | string | Path to uploaded file (optional)     |
| sentiment    | string | Positive / Neutral / Negative        |
| validity     | string | Valid / Invalid / Pending            |
| importance   | int    | Keyword importance score             |
| priority     | string | Critical / High / Medium / Low       |
| submitted_at | string | Submission timestamp                 |

---

## API Endpoints

| Method | Endpoint           | Auth     | Description                   |
|--------|--------------------|----------|-------------------------------|
| POST   | /auth/register     | No       | Register a new citizen        |
| POST   | /auth/login        | No       | Login, returns JWT token      |
| GET    | /auth/me           | JWT      | Get logged-in user profile    |
| POST   | /submit            | JWT      | File a new complaint          |
| GET    | /my-complaints     | JWT      | Get current user's complaints |
| GET    | /dashboard         | JWT      | Get all complaints (admin)    |

---

XGBoost is used to classify complaints based on priority (High, Medium, Low)

Complaint text is collected from users via forms or dashboard

Text preprocessing is applied:

Lowercasing

Removing stopwords and punctuation

Tokenization

Text is converted into numerical features using TF-IDF vectorization

These features are given as input to the XGBoost classifier

The model learns patterns such as:

“urgent”, “not working”, “emergency” → High priority

“issue”, “delay” → Medium priority

“suggestion”, “feedback” → Low priority

The trained model predicts the sentiment and importance level of each complaint

Output is categorized into:

High Priority

 Medium Priority

 Low Priority

The result is stored in the database and displayed on the dashboard

Helps authorities to prioritize critical complaints quickly

Reduces manual effort and improves decision-making efficiency