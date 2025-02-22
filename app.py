from flask import Flask, render_template, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
import os
from datetime import datetime
from io import BytesIO

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = "uploads"

from models import db, Expense, Category

with app.app_context():
    db.init_app(app)
    db.create_all()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/get_categories")
def get_categories():
    categories = Category.query.all()
    return jsonify([{"name": cat.name, "description": cat.category_desc} for cat in categories])

@app.route("/add_expense", methods=["POST"])
def add_expense():
    data = request.form.to_dict()

    name = data.get("name")
    category_name = data.get("category")
    date_str = data.get("date")
    amount = data.get("amount")
    description = data.get("description", "")
    file_name = None

    if not name or not category_name or not date_str or not amount:
        return jsonify({"message": "Missing required fields!"}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({"message": "Invalid amount!"}), 400

    if category_name == "Others":
        category_name = data.get("custom-category")
        if not category_name:
            return jsonify({"message": "Custom category name is required!"}), 400

    category = Category.query.filter_by(name=category_name).first()
    if not category:
        category_desc = data.get("category-desc", "")
        category = Category(name=category_name, category_desc=category_desc)
        db.session.add(category)
        db.session.commit()

    try:
        date = datetime.strptime(date_str, "%Y-%m-%d").date()  # Ensure only the date is stored
    except ValueError:
        return jsonify({"message": "Invalid date format!"}), 400

    file = request.files.get("file-upload")
    if file and file.filename:
        file_data = file.read()
        new_expense = Expense(
            name=name, category_id=category.category_id, date=date, amount=amount, description=description, image_data=file_data
        )
    else:
        new_expense = Expense(
            name=name, category_id=category.category_id, date=date, amount=amount, description=description
        )
    db.session.add(new_expense)
    db.session.commit()

    return jsonify({
        "message": "Expense added successfully!"
    })

@app.route("/get_expenses")
def get_expenses():
    expenses = Expense.query.all()
    return jsonify([{
        "id": exp.id, "name": exp.name, "category": exp.category.name if exp.category else "Unknown", "date": exp.date.strftime("%Y-%m-%d"),
        "amount": exp.amount, "description": exp.description, "image_url": f"/get_image/{exp.id}" if exp.image_data else None
    } for exp in expenses])

@app.route("/get_expense/<int:expense_id>")
def get_expense(expense_id):
    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"message": "Expense not found"}), 404

    return jsonify({
        "id": expense.id,
        "name": expense.name,
        "category": expense.category.name if expense.category else "Unknown",
        "category_desc": expense.category.category_desc if expense.category else "",
        "date": expense.date.strftime("%Y-%m-%d"),
        "amount": expense.amount,
        "description": expense.description,
        "image_url": f"/get_image/{expense.id}" if expense.image_data else None  # Update to use image_data
    })

@app.route("/get_image/<int:expense_id>")
def get_image(expense_id):
    expense = Expense.query.get(expense_id)
    if not expense or not expense.image_data:
        return jsonify({"message": "Image not found"}), 404
    return send_file(BytesIO(expense.image_data), mimetype='image/jpeg')

@app.route("/edit_expense/<int:expense_id>", methods=["PUT"])
def edit_expense(expense_id):
    expense = Expense.query.get(expense_id)

    if not expense:
        return jsonify({"message": "Expense not found"}), 404

    data = request.form.to_dict()

    expense.name = data.get("name", expense.name)
    category_name = data.get("category", expense.category.name)
    expense.amount = float(data.get("amount", expense.amount))
    expense.description = data.get("description", expense.description)

    if category_name == "Others":
        category_name = data.get("custom-category")
        if not category_name:
            return jsonify({"message": "Custom category name is required!"}), 400

    category = Category.query.filter_by(name=category_name).first()
    if not category:
        category_desc = data.get("category-desc", "")
        category = Category(name=category_name, category_desc=category_desc)
        db.session.add(category)
        db.session.commit()
    expense.category_id = category.category_id

    try:
        expense.date = datetime.strptime(data.get("date"), "%Y-%m-%d").date()  # Ensure only the date is stored
    except ValueError:
        return jsonify({"message": "Invalid date format!"}), 400

    file = request.files.get("file-upload")
    if file and file.filename:
        file_data = file.read()
        expense.image_data = file_data  # Update file data in the database

    db.session.commit()

    return jsonify({"message": "Expense updated successfully!"})

@app.route("/delete_expense/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    expense = Expense.query.get(expense_id)

    if not expense:
        return jsonify({"message": "Expense not found"}), 404

    category_id = expense.category_id
    db.session.delete(expense)
    db.session.commit()

    # Check if the category is still used by any other expenses
    remaining_expenses = Expense.query.filter_by(category_id=category_id).count()
    if remaining_expenses == 0:
        category = Category.query.get(category_id)
        db.session.delete(category)
        db.session.commit()

    return jsonify({"message": "Expense deleted successfully!"})

if __name__ == "__main__":
    app.run(debug=True)
