#!/usr/bin/env python3
"""
Script to create database tables if they don't exist.
Run this as a fallback if the database hasn't been initialized.
"""

from database import create_db_and_tables

if __name__ == "__main__":
    print("Creating database tables...")
    create_db_and_tables()
    print("Database tables created successfully!")