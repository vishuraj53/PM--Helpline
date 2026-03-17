import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from xgboost import XGBClassifier
import joblib

df = pd.read_csv("dataset.csv")

X = df["text"]
y = df["label"]

vectorizer = TfidfVectorizer()
X_vec = vectorizer.fit_transform(X)

model = XGBClassifier()
model.fit(X_vec, y)

joblib.dump(model, "xgb_model.pkl")
joblib.dump(vectorizer, "tfidf.pkl")

print("Model trained!")
