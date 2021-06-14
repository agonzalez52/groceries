import pandas as pd
from datetime import date
from datetime import timedelta
import numpy as np
import gdocs_funcs as gfuncs

# add ingredients to google doc given the id's to the meals
def update_grocery_list(ids, doc_service, sheet_service, doc_id, sheet_id, week_date, font_color):
    check_meal_list_size(ids)

    # Open Meals and Ingredients tables
    meals_data = gfuncs.pull_sheet_data(sheet_service, sheet_id, 'Meals')
    meals = pd.DataFrame(meals_data[1:], columns=meals_data[0])
    meals = meals.set_index('id')
    ingredients_data = gfuncs.pull_sheet_data(sheet_service, sheet_id, 'Ingredients')
    ingredients = pd.DataFrame(ingredients_data[1:], columns=ingredients_data[0])

    meals_log = open("logs/Meal Schedule "+week_date.strftime("%m-%d-%y")+
        '.txt',"w")

    i = 0
    # loop through meals
    for id in ids:
        update_meal_date(meals, week_date, id, sheet_service)

        # get csv values from Meal
        meal_name = meals.loc[str(id), 'name']
        print('---------------------------------------------------------------')
        print('MEAL: '+meal_name)

        # meal_day = day meal is being made
        meal_abbrev = meals.loc[str(id), 'abbrev']
        meal_day = week_date + timedelta(days=i)
        i+=1
        write_ingredients_to_doc(doc_service, doc_id, ingredients, id, meal_abbrev,
        meal_name, meal_day, font_color)

        meals_log.write(meal_day.strftime("%A, %m/%d")+'\n'+meal_name+'\n\n')

        meal_extra = meals.loc[str(id), 'extra']
        if isinstance(meal_extra, str) and meal_extra != 'N/A':
            # insert Extras at end of doc
            start_i, end_i = gfuncs.get_text_range_idx(doc_service, doc_id, 'Extra', True)
            extra_msg = f'{meal_abbrev.strip("()")}\n{str(meal_extra)}\n'
            gfuncs.insert_text(doc_service, doc_id, end_i, extra_msg, font_color, True)

    meals_log.close()

# Warns if the list of ids is less than 6
def check_meal_list_size(ids):
    if len(ids) < 6:
        response = input("\nWARNING: List size is "+str(len(ids))+
            ". Do you want to continue? ")
        if response != 'y':
            exit()

# loop through ingredients for meal 'id' and add to doc
def write_ingredients_to_doc(doc_service, doc_id, ingredients, id, meal_abbrev,
    meal_name, meal_day, font_color):
    # get all the ingredients for the meal and write them to doc
    for index,row in ingredients[ingredients['id']==str(id)].iterrows():
        # get ingredient, section name, and days before take down
        ingredient = row['name']
        section = row['section']
        days_before = row['days_before_action']
        action = row['action']
        time = row['time']
        notify_who = row['notify_who']
        notify_when = row['notify_when']

        # insert ingredient to google doc
        start_i, end_i = gfuncs.get_text_range_idx(doc_service, doc_id, section, True)
        ingredient_msg = f'{ingredient} {meal_abbrev}'
        gfuncs.insert_text(doc_service, doc_id, end_i, ingredient_msg, font_color, True)

        # create reminder in google doc if ingredient needs a reminder
        if int(days_before) > 0:
            make_one_reminder(doc_service, doc_id, meal_day, days_before, action,
                ingredient, time, notify_who, notify_when,
                meal_name, font_color)

# write reminder to google doc for a given 'ingredient'
def make_one_reminder(doc_service, doc_id, meal_day, days_before, action,
                        ingredient, time, notify_who, notify_when, meal_name,
                        font_color):
    # days_before is set to 10 in csv if reminder is for same day
    if int(days_before) >= 10:
        days_before = 0

    start_j, end_j = gfuncs.get_text_range_idx(doc_service, doc_id, 'Reminders', False)
    reminder_msg = (
    f'{meal_name}'
    f'({meal_day.strftime("%a")}) - {action} {ingredient} on '
    f'{(meal_day-timedelta(int(days_before))).strftime("%a, %m-%d")} at '
    f'{time}. Add {notify_who}, notify at {notify_when}\n'
    )
    gfuncs.insert_text(doc_service, doc_id, end_j, reminder_msg, font_color, True)

# write the week a meal is being made in Meals sheet
def update_meal_date(meals, week_date, meal, sheet_service):
    # write week date to meals
    meals.loc[str(meal), 'week'] = week_date.strftime("%m-%d-%y")

    # get week column from dataframe
    date_values = np.reshape(meals.loc[:,'week'].values.tolist(),
        (len(meals.index), 1))
    date_length = len(meals.index)

    # write week to google sheet
    response_date = sheet_service.spreadsheets().values().update(
        spreadsheetId=gfuncs.SHEET_ID,
        valueInputOption='USER_ENTERED',
        range='Meals!D2:D{}'.format(date_length+1),
        body=dict(
            majorDimension='ROWS',
            values=date_values.tolist())
    ).execute()

# write reminders in google doc and update meal date in csv given meals for week
def make_reminders(ids, doc_service, sheet_service, sheet_id, week_date):
    # Open Meals and ingredients tables
    meals_data = gfuncs.pull_sheet_data(sheet_service, sheet_id, 'Meals')
    meals = pd.DataFrame(meals_data[1:], columns=meals_data[0])
    meals = meals.set_index('id')
    ingredients_data = gfuncs.pull_sheet_data(sheet_service, sheet_id, 'Ingredients')
    ingredients = pd.DataFrame(ingredients_data[1:], columns=ingredients_data[0])

    i = 0
    # loop through meals
    for meal in ids:
        update_meal_date(meals, week_date, meal, sheet_service)

        # meal_day = day meal is being made
        meal_day = week_date + timedelta(days=i)
        i+=1
        # get meal name from dataframe
        meal_name = meals.loc[str(meal), 'name']
        # loop through meal ingredients
        for index,row in ingredients[ingredients['id']==str(meal)].iterrows():
            ingredient = row['name']
            days_before = row['days_before_action']
            action = row['action']
            time = row['time']
            notify_who = row['notify_who']
            notify_when = row['notify_when']

            # create reminder in google doc if ingredient needs a reminder
            if int(days_before) > 0:
                make_one_reminder(doc_service, doc_id, meal_day, days_before, action,
                                    ingredient, time, notify_who, notify_when,
                                    meal_name, font_color)
