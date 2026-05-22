#!/usr/bin/env python
"""
Diagnostic script to find duplicate LibraryItem records in the database.
This helps identify data corruption issues.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import LibraryItem
from django.db.models import Count
from collections import defaultdict

print("=" * 60)
print("LibraryItem Duplicate Detection")
print("=" * 60)

# Find all LibraryItems and check for duplicates by ID
print("\nChecking for duplicate IDs in LibraryItem model...")

library_items = LibraryItem.objects.all()
total_count = library_items.count()
print(f"Total LibraryItems in database: {total_count}")

# Get all IDs and their counts
id_counts = defaultdict(list)
for item in library_items:
    id_counts[item.id].append(item)

# Find duplicates
duplicates = {pk: items for pk, items in id_counts.items() if len(items) > 1}

if duplicates:
    print(f"\n⚠️  Found {len(duplicates)} duplicate IDs:")
    for pk, items in sorted(duplicates.items()):
        print(f"\n  ID {pk}: {len(items)} records")
        for item in items:
            print(f"    - Name: {item.name}")
            print(f"      Created: {item.created_at}")
            print(f"      Updated: {item.updated_at}")
            print(f"      Active: {item.is_active}")
else:
    print("\n✓ No duplicate IDs found.")

# Check if database has issues by looking at the raw database
print("\n" + "=" * 60)
print("Database Query Results:")
print("=" * 60)

# Using raw SQL to see what the database actually contains
from django.db import connection
cursor = connection.cursor()
cursor.execute("SELECT id, COUNT(*) as count FROM master_data_libraryitem GROUP BY id HAVING count > 1")
rows = cursor.fetchall()

if rows:
    print(f"\nFound {len(rows)} IDs with multiple records:")
    for row in rows:
        pk, count = row
        print(f"  ID {pk}: {count} records")
else:
    print("\n✓ No duplicate IDs found at database level.")

# Show details for ID 458 specifically
print("\n" + "=" * 60)
print("Checking for LibraryItem ID 458:")
print("=" * 60)

items_458 = list(LibraryItem.objects.filter(id=458))
print(f"Found {len(items_458)} record(s) with ID 458")

for item in items_458:
    print(f"\n  Name: {item.name}")
    print(f"  Description: {item.description}")
    print(f"  Created: {item.created_at}")
    print(f"  Updated: {item.updated_at}")
    print(f"  Active: {item.is_active}")
    print(f"  Session: {item.session}")
    print(f"  Class Level: {item.class_level}")

print("\n" + "=" * 60)
