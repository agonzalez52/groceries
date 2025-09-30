import pandas as pd
from datetime import timedelta
import numpy as np
import os
import sys
import time

class MealBatch:
    def __init__(self, week_date, meal_ids):
        self.week_date = week_date
        self.ids = meal_ids

    # Warns if the list of ids is less than 6
    def check_meal_list_size(self):
        if len(self.ids) < 6:
            response = input("\nWARNING: There are only "+str(len(self.ids))+
                " meal(s). Do you want to continue? ")
            if response != 'y':
                exit()

    # Warns if first day is not Monday
    def check_start_day(self):
        if self.week_date.weekday() > 0:
            first_day = self.week_date.strftime('%A, %m/%d/%Y') # format date as 'Monday 7/14/2012'
            response = input("\nWARNING: First day is not Monday (it's "+first_day+"). Do you want to continue? ")
            if response != 'y':
                exit()

class Meal:
    def __init__(self, id, name, rank, week_date, day, abbrev, extra, notes):
        self.id = id
        self.name = name
        self.rank = rank
        self.week_date = week_date
        self.day = day
        self.abbrev = abbrev
        self.extra = extra
        self.notes = notes

    def extra_message(self):
        return f'{self.abbrev.strip("()")}\n{str(self.extra)}\n'

class Ingredient:
    def __init__(self, id, name, section, days_before_action, action, time,
        notify_who, notify_when):
        self.id = id
        self.name = name
        self.section = section
        self.days_before_action = days_before_action
        self.action = action
        self.time = time
        self.notify_who = notify_who
        self.notify_when = notify_when

    def reminder_message(self, meal):
        return (
        f'{meal.name}'
        f'({meal.day.strftime("%a")}) - {self.action} {self.name} on '
        f'{(meal.day-timedelta(int(self.days_before_action))).strftime("%a, %m-%d")} at '
        f'{self.time}\n'
        )

MEAL_LOG_RECEIVERS = ['fgonzalez55555@gmail.com', 'jesusgong333@gmail.com']
MY_EMAIL = 'angelmg58@gmail.com'

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
    ingredient = Ingredient(ingredient_id, ingredient_name, section, days_before,
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
    meal = Meal(meal_id, meal_name, meal_rank, week_date, meal_day,
        meal_abbrev, meal_extra, meal_notes)
    return meal

# add ingredients to google doc given the id's to the meals
def update_grocery_list(meal_batch, gapi, reminders_only=0, checklist=1):
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

    # list of people who will get an all day event for dinner
    dinner_attendees = 'Fernando'

    i = 0
    try:
        # loop through meals
        for meal_id in meal_batch.ids:
            # skip day if meal id in array is given as 0
            if meal_id <= 0:
                skipped_day = meal_batch.week_date + timedelta(days=i)
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

                print('---------------------------------------------------------------')
                print('MEAL: '+meal.name+' - '+meal.day.strftime("%a %m/%d"))

                # create all day event for dinner
                gapi.gcalendar.create_dinner_event(meal, dinner_attendees)

                write_meal_date_to_sheet(meals_df, meal, gapi.gsheet)

                write_ingredients_to_doc(ingredients_df, meal, gapi, reminders_only, checklist)

                # Only write extras if reminders_only flag is off
                if (reminders_only <= 0):
                    write_extra_message_to_doc(meal, gapi.gdoc)

                meals_log.write(meal.day.strftime("%A, %m/%d")+'\n'+meal.name+'\n\n')
            i+=1
    except KeyboardInterrupt:
        print('\nKeyboarInterrupt: Program terminated by user\n')

    meals_log.close()
    email_meal_log(MY_EMAIL, meals_log_name.replace(os.path.abspath(os.getcwd())+'/logs/',''), '', meals_log_path, gapi.gmail)


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
def write_ingredients_to_doc(ingredients_df, meal, gapi, reminders_only=0, checklist=1):
    # get all the ingredients for the meal and write them to doc
    for index,row in ingredients_df[ingredients_df['id']==str(meal.id)].iterrows():
        # create ingredient object
        ingredient = create_ingredient(row)

        if (reminders_only <= 0):
            # insert ingredient to google doc
            start_i, end_i = gapi.gdoc.get_text_range_idx(ingredient.section, True)
            ingredient_msg = f'{ingredient.name} {meal.abbrev}'
            if (checklist <= 0):
                gapi.gdoc.insert_text(end_i, ingredient_msg, True)
            else:
                gapi.gdoc.insert_checklist_item(end_i, ingredient_msg, True)

        # create google calendar reminder if ingredient needs a reminder
        if int(ingredient.days_before_action) > 0:
            # days_before is set to 10 in google sheet if reminder is for same day
            if int(ingredient.days_before_action) >= 10:
                ingredient.days_before_action = 0
            gapi.gcalendar.create_ingredient_event(meal, ingredient)

# write a meal's extra ingredients to google doc grocery list
def write_extra_message_to_doc(meal, gdoc):
    if isinstance(meal.extra, str) and meal.extra != 'N/A':
            # insert Extras at end of doc
            start_i, end_i = gdoc.get_text_range_idx('Extra', True)
            extra_msg = meal.extra_message()
            gdoc.insert_text(end_i, extra_msg, True)

def email_meal_log(sender, subject, message_text, file_path, gmail):
    for receiver in MEAL_LOG_RECEIVERS:
        message = gmail.create_message_with_attachment(sender, receiver, subject, message_text, file_path)
        gmail.send_message(sender, message)
