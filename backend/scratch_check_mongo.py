from pymongo import MongoClient
import os

client = MongoClient('mongodb://localhost:27017/')
db = client['pathfinder_student_portal'] # I'll assume this is the DB name from earlier logs
collection = db['api_grievance']

print("Listing last 3 grievances:")
for doc in collection.find().sort('date', -1).limit(3):
    print(f"ID: {doc.get('_id')} | StudentID: {doc.get('student_id')} | StudentName: {doc.get('student_name')}")
