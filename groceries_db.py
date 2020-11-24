import mysql.connector

grocery_db = mysql.connector.connect(
    host = "localhost",
    user = "Angel",
    password = "root",
    database = "GroceriesDB"
)

curs = grocery_db.cursor()
# Create database
#curs.execute("CREATE DATABASE GroceriesDB")

# Define Meals table
MealsTable = "CREATE TABLE Meals \
            ( \
                Id int AUTO_INCREMENT, \
                Name VARCHAR(25), \
                This_time BINARY, \
                Last_time BINARY \
            );"

# Define Ingredients table
IngredientsTable = "CREATE TABLE Ingredients \
                    ( \
                        Id int AUTO_INCREMENT, \
                        Name VARCHAR(25), \
                        Paren VARCHAR(25) \
                    );"

# Create Meals table in GroceriesDB
curs.execute(MealsTable)
# Create Ingredients table in GroceriesDB
curs.execute(IngredientsTable)