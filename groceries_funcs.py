import pandas as pd
from datetime import date
from datetime import timedelta
import numpy as np
import groceries_gdocs_funcs as gfuncs

# color codes for text
color_red = [0.0,0.0,1.0]
color_green = [0.0,1.0,0.0]
color_blue = [1.0,0.0,0.0]
color_black = [0.0,0.0,0.0]
color_yellow = [0.0,1.0,1.0]

# loop through ingredients for meal 'id' and add to doc
def write_ingredients_to_doc(doc_service, Ingredients, id, Meal_abbrev,
    Meal_name, meal_day):
    # get all the ingredients for the meal and write them to doc
    for index,row in Ingredients[Ingredients['id']==str(id)].iterrows():
        # get ingredient, section name, and days before take down
        ingredient = row['name']
        section = row['section']
        days_before = row['days_before_action']
        action = row['action']
        time = row['time']
        notify_who = row['notify_who']
        notify_when = row['notify_when']

        # insert ingredient to google doc
        start_i, end_i = get_text_range_idx(doc_service, section, True)
        insert_text(doc_service, end_i, ingredient+' '+Meal_abbrev, color_red,
            True)

        # create reminder in google doc if ingredient needs a reminder
        if int(days_before) > 0:
            make_one_reminder(doc_service, meal_day, days_before, action,
                ingredient, time, notify_who, notify_when,
                Meal_name)

# add ingredients to google doc given the id's to the meals
def update_grocery_list(ids, doc_service, sheet_service, week_date, test_run=0):
    # Open Meals and Ingredients tables
    Meals_data = pull_sheet_data(sheet_service, 'Meals')
    Meals = pd.DataFrame(Meals_data[1:], columns=Meals_data[0])
    Meals = Meals.set_index('id')
    Ingredients_data = pull_sheet_data(sheet_service, 'Ingredients')
    Ingredients = pd.DataFrame(Ingredients_data[1:], columns=Ingredients_data[0])
    # Meals = pd.read_csv('Meals Table.csv', index_col='id')
    # Ingredients = pd.read_csv('Ingredients Table.csv')

    #meals_file = open("logs/Meal Schedule "+week_date.strftime("%m-%d-%y")+'.txt'
        #,"w")

    i = 0
    # loop through meals
    for id in ids:
        if test_run<=0:
            update_meal_date(Meals, week_date, id)

        # meal_day = day meal is being made
        meal_day = week_date + timedelta(days=i)
        i+=1

        # get csv values from Meal
        Meal_name = Meals.loc[str(id), 'name']
        print('---------------------------------------------------------------')
        print('MEAL: '+Meal_name)
        #meals_file.write(meal_day.strftime("%A, %m/%d")+'\n'+Meal_name+'\n\n')
        Meal_abbrev = Meals.loc[str(id), 'abbrev']
        Meal_extra = Meals.loc[str(id), 'extra']

        write_ingredients_to_doc(doc_service, Ingredients, id, Meal_abbrev,
        Meal_name, meal_day)

        if isinstance(Meal_extra, str) and Meal_extra != 'N/A':
            # insert Extras at end of doc
            start_i, end_i = get_text_range_idx(doc_service, 'Extra', True)
            insert_text(doc_service, end_i,
                Meal_abbrev.strip('()')+'\n'+str(Meal_extra)+'\n'
                , color_red, True)

    #meals_file.close()

# write reminders in google doc and update meal date in csv given meals for week
def make_reminders(ids, doc_service, week_date):
    # Open Meals and Ingredients tables
    Meals_data = pull_sheet_data(sheet_service, 'Meals')
    Meals = pd.DataFrame(Meals_data[1:], columns=Meals_data[0])
    Meals = Meals.set_index('id')
    Ingredients_data = pull_sheet_data(sheet_service, 'Ingredients')
    Ingredients = pd.DataFrame(Ingredients_data[1:], columns=Ingredients_data[0])

    i = 0
    # loop through Meals
    for meal in ids:
        update_meal_date(Meals, week_date, meal)

        # meal_day = day meal is being made
        meal_day = week_date + timedelta(days=i)
        i+=1

        # get csv values for Meal
        Meal_name = Meals.loc[str(meal), 'name']

        # loop through meal ingredients
        for index,row in Ingredients[Ingredients['id']==str(meal)].iterrows():
            ingredient = row['name']
            days_before = row['days_before_action']
            action = row['action']
            time = row['time']
            notify_who = row['notify_who']
            notify_when = row['notify_when']

            # create reminder in google doc if ingredient needs a reminder
            if int(days_before) > 0:
                make_one_reminder(doc_service, meal_day, days_before, action,
                                    ingredient, time, notify_who, notify_when,
                                    Meal_name)

# write reminder to google doc for a given 'ingredient'
def make_one_reminder(doc_service, meal_day, days_before, action,
                        ingredient, time, notify_who, notify_when, meal_name):
    # days_before is set to 10 in csv if reminder is for same day
    if int(days_before) >= 10:
        days_before = 0
    start_j, end_j = get_text_range_idx(doc_service, 'Reminders', False)
    insert_text(doc_service, end_j, meal_name+' ('+meal_day.strftime("%a")+
        ') - '+action+' '+ingredient+' '+'on '+
        (meal_day-timedelta(int(days_before))).strftime("%a, %m-%d")+' at '
        +time+' in Fam calendar. Add '+notify_who+', notify at '+notify_when+
        ', default color, on private\n', color_red, True)

# write the week a meal is being made in Meals sheet
def update_meal_date(Meals, week_date, meal):
    # write week date to Meals
    Meals.loc[str(meal), 'week'] = week_date.strftime("%m-%d-%y")

    # write week to csv
    date_values = np.reshape(Meals.loc[:,'week'].values.tolist(), (len(Meals.index), 1))
    date_length = len(Meals.index)

    response_date = sheet_service.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        valueInputOption='USER_ENTERED',
        range='Meals!D2:D{}'.format(date_length+1),
        body=dict(
            majorDimension='ROWS',
            values=date_values.tolist())
    ).execute()
    #Meals.to_csv('Meals Table.csv')
