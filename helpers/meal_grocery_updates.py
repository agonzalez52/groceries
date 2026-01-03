#
# Core functions for
# - writing to grocery list
# - creating dinner calendar events
# - updating date on meal sheet
# - e-mailing meal schedule log
#

from datetime import timedelta
from dotenv import load_dotenv
import meal_components as mc
import groceries_api as api
import pandas as pd
import numpy as np
import os
import sys
import time
import json

load_dotenv()
MY_CALENDAR_GMAIL = os.getenv("MY_CALENDAR_GMAIL")
DINNER_ATTENDEES = os.getenv("DINNER_ATTENDEES")
if DINNER_ATTENDEES:
    DINNER_ATTENDEES_DICT = json.loads(DINNER_ATTENDEES)
else:
    print("DINNER_ATTENDEES env var was not found or is empty")

# create an ingredient object given an ingredient dataframe's row
def create_ingredient(row):
    ingredient_id = row['id']
    ingredient_name = row['name']
    section = row['section']
    days_before = row['days_before_action']
    action = row['action']
    time = row['time']
    notify_who = row['notify_who']
    notify_when = row['notify_when']
    ingredient = mc.Ingredient(ingredient_id, ingredient_name, section, days_before,
        action, time, notify_who, notify_when)
    return ingredient

# create a meal object given the row, week of meal, and meal day offset
def create_meal(row_df, week_date, i):
    meal_id = row_df.index[0]
    row = row_df.iloc[0]
    meal_name = row['name']
    meal_abbrev = row['abbrev']
    meal_day = week_date + timedelta(days=i)
    meal_extra = row['extra']
    meal_rank = row['rank']
    meal_notes = row['notes']
    meal = mc.Meal(meal_id, meal_name, meal_rank, week_date, meal_day,
        meal_abbrev, meal_extra, meal_notes)
    return meal

# write the week a meal is being made to the google sheet
def write_meal_date_to_sheet(meals_df, meal, gsheet):
    # write week date to meals dataframe
    meals_df.loc[str(meal.id), 'week'] = meal.week_date.strftime("%m-%d-%y")

    # get week column from dataframe
    date_values = np.reshape(meals_df.loc[:,'week'].values.tolist(),
        (len(meals_df.index), 1))
    date_length = len(meals_df.index)

    # write week to google sheet
    sheet_range = 'Meals!D2:D{}'.format(date_length+1)
    data = date_values.tolist()
    gsheet.write_data(sheet_range, data)

# write a meal's ingredients to google doc grocery list
def write_ingredients_to_doc(ingredients_df, meal, gapi, is_api_run, reminders_only=0, checklist=1):
    # get all the ingredients for the meal and write them to doc
    for index,row in ingredients_df[ingredients_df['id']==str(meal.id)].iterrows():
        # create ingredient object
        ingredient = create_ingredient(row)

        if (reminders_only <= 0):
            # insert ingredient to google doc
            start_i, end_i = gapi.gdoc.get_text_range_idx(ingredient.section, is_api_run)
            ingredient_msg = f'{ingredient.name} {meal.abbrev}'
            if (checklist <= 0):
                gapi.gdoc.insert_text(end_i, ingredient_msg, is_api_run)
            else:
                gapi.gdoc.insert_checklist_item(end_i, ingredient_msg, is_api_run)

        # create google calendar reminder if ingredient needs a reminder
        if int(ingredient.days_before_action) > 0:
            # days_before is set to 10 in google sheet if reminder is for same day
            if int(ingredient.days_before_action) >= 10:
                ingredient.days_before_action = 0
            gapi.gcalendar.create_ingredient_event(meal, ingredient, is_api_run)

# write a meal's extra ingredients to google doc grocery list
def write_extra_message_to_doc(meal, gdoc, is_api_run):
    if isinstance(meal.extra, str) and meal.extra != 'N/A':
            # insert Extras at end of doc
            start_i, end_i = gdoc.get_text_range_idx('Extra', is_api_run)
            extra_msg = meal.extra_message()
            gdoc.insert_text(end_i, extra_msg, is_api_run)

def email_meal_log(sender, subject, message_text, file_path, gmail):
    for receiver in DINNER_ATTENDEES_DICT.values():
        message = gmail.create_message_with_attachment(sender, receiver, subject, message_text, file_path)
        gmail.send_message(sender, message)

# add ingredients to google doc given the id's to the meals
def update_grocery_list(meal_batch, gapi, is_api_run, reminders_only=0, checklist=1):
    meal_batch.check_meal_list_size()
    meal_batch.check_start_day()

    # Create meals and ingredients dataframes
    meals_data = gapi.gsheet.pull_sheet_data('Meals')
    meals_df = pd.DataFrame(meals_data[1:], columns=meals_data[0])
    meals_df = meals_df.set_index('id')
    ingredients_data = gapi.gsheet.pull_sheet_data('Ingredients')
    ingredients_df = pd.DataFrame(ingredients_data[1:], columns=ingredients_data[0])

    # create meal log
    meals_log_path = os.path.abspath(os.getcwd())+"/logs/Meal Schedule "+meal_batch.week_date.strftime("%m-%d-%y")+'.txt'
    meals_log_directory = os.path.dirname(meals_log_path)
    os.makedirs(meals_log_directory, exist_ok=True)
    meals_log_name = meals_log_path.replace('.txt','')
    meals_log = open(meals_log_path,"w")

    if is_api_run:
        api_response = api.GroceryRunResponse()
        api_response.start_date = meal_batch.week_date
        api_response.meal_count = 0

    i = 0
    try:
        # loop through meals
        for meal_id in meal_batch.ids:
            # skip day if meal id in array is given as 0
            if meal_id <= 0:
                skipped_day = meal_batch.week_date + timedelta(days=i)
                if is_api_run:
                    skipped_meal_details = api.GroceryRunResponse.MealDetails(meal_name="Skipped",meal_day=skipped_day.strftime("%A %m/%d"))
                    skipped_meal = skipped_meal_details
                    api_response.meal_details.append(skipped_meal)
                    api_response.meals.append("Skipped")
                else:
                    print('---------------------------------------------------------------')
                    print('Skipping '+skipped_day.strftime("%a %m/%d")+' ...')
                    time.sleep(1)
            else:
                # create meal object
                try:
                    row_df = meals_df.loc[[str(meal_id)]]
                except KeyError as e:
                    print(f'\nERROR: \nKeyError when searching for meal id {meal_id} in Groceries sheet: {e}\n')
                    sys.exit(1)
                meal = create_meal(row_df, meal_batch.week_date, i)

                if is_api_run:
                    added_meal_details = api.GroceryRunResponse.MealDetails(meal_name=meal.name,meal_day=meal.day.strftime("%A %m/%d"))
                    added_meal = added_meal_details
                    api_response.meal_details.append(added_meal)
                    api_response.meals.append(meal.name)
                else:
                    print('---------------------------------------------------------------')
                    print('MEAL: '+meal.name+' - '+meal.day.strftime("%a %m/%d"))

                # create all day event for dinner
                gapi.gcalendar.create_dinner_event(meal, DINNER_ATTENDEES_DICT, is_api_run)

                write_meal_date_to_sheet(meals_df, meal, gapi.gsheet)

                write_ingredients_to_doc(ingredients_df, meal, gapi, is_api_run, reminders_only, checklist)

                # Only write extras if reminders_only flag is off
                if (reminders_only <= 0):
                    write_extra_message_to_doc(meal, gapi.gdoc, not is_api_run)

                meals_log.write(meal.day.strftime("%A, %m/%d")+'\n'+meal.name+'\n\n')
            i+=1
            if is_api_run:
                api_response.meal_count+=1
    except KeyboardInterrupt:
        print('\nKeyboarInterrupt: Program terminated by user\n')

    meals_log.close()
    email_meal_log(MY_CALENDAR_GMAIL, meals_log_name.replace(os.path.abspath(os.getcwd())+'/logs/',''), '', meals_log_path, gapi.gmail)

    if is_api_run:
        return api_response
    else:
        return None