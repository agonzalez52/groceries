import pandas as pd
from datetime import date
from datetime import timedelta
import numpy as np
import gdocs_module as gdocs

class MealBatch:
    def __init__(self, week_date, meal_ids):
        self.week_date = week_date
        self.ids = meal_ids

class Meal:
    def __init__(self, id, name, rank, week, day, abbrev, extra, notes):
        self.id = id
        self.name = name
        self.rank = rank
        self.week = week
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
        f'{self.time}. Add {self.notify_who}, notify at {self.notify_when}\n'
        )


# add ingredients to google doc given the id's to the meals
def update_grocery_list(meal_batch, gdoc, gsheet):
    check_meal_list_size(meal_batch.ids)

    # Open Meals and Ingredients tables
    meals_data = gsheet.pull_sheet_data('Meals')
    meals_df = pd.DataFrame(meals_data[1:], columns=meals_data[0])
    meals_df = meals_df.set_index('id')
    ingredients_data = gsheet.pull_sheet_data('Ingredients')
    ingredients_df = pd.DataFrame(ingredients_data[1:], columns=ingredients_data[0])

    meals_log = open("logs/Meal Schedule "+meal_batch.week_date.strftime("%m-%d-%y")+
        '.txt',"w")

    i = 0
    # loop through meals
    for meal_id in meal_batch.ids:
        # get csv values from Meal
        meal_name = meals_df.loc[str(meal_id), 'name']
        print('---------------------------------------------------------------')
        print('MEAL: '+meal_name)

        # create meal object
        meal_abbrev = meals_df.loc[str(meal_id), 'abbrev']
        # meal_day = day meal is being made
        meal_day = meal_batch.week_date + timedelta(days=i)
        i+=1
        meal_extra = meals_df.loc[str(meal_id), 'extra']
        meal_rank = meals_df.loc[str(meal_id), 'rank']
        meal_notes = meals_df.loc[str(meal_id), 'notes']
        meal = Meal(meal_id, meal_name, meal_rank, meal_batch.week_date, meal_day,
            meal_abbrev, meal_extra, meal_notes)

        update_meal_date(meals_df, meal, gsheet)

        write_ingredients_to_doc(gdoc, ingredients_df, meal)

        meals_log.write(meal.day.strftime("%A, %m/%d")+'\n'+meal.name+'\n\n')

        if isinstance(meal.meal_extra, str) and meal.meal_extra != 'N/A':
            # insert Extras at end of doc
            start_i, end_i = gdoc.get_text_range_idx('Extra', True)
            extra_msg = meal.extra_message()
            gdoc.insert_text(end_i, extra_msg, True)

    meals_log.close()

# Warns if the list of ids is less than 6
def check_meal_list_size(ids):
    if len(ids) < 6:
        response = input("\nWARNING: List size is "+str(len(ids))+
            ". Do you want to continue? ")
        if response != 'y':
            exit()

# loop through ingredients for meal 'id' and add to doc
def write_ingredients_to_doc(gdoc, ingredients_df, meal):
    # get all the ingredients for the meal and write them to doc
    for index,row in ingredients_df[ingredients_df['id']==str(meal.id)].iterrows():
        # make ingredient object
        ingredient_name = row['name']
        section = row['section']
        days_before = row['days_before_action']
        action = row['action']
        time = row['time']
        notify_who = row['notify_who']
        notify_when = row['notify_when']
        ingredient = Ingredient(meal.id, ingredient, days_before, action, time,
            notify_who, notify_when)

        # insert ingredient to google doc
        start_i, end_i = gdoc.get_text_range_idx(section, True)
        ingredient_msg = f'{ingredient.name} {meal.abbrev}'
        gdoc.insert_text(end_i, ingredient_msg, True)

        # create reminder in google doc if ingredient needs a reminder
        if int(days_before) > 0:
            make_one_reminder(gdoc, meal, ingredient)

# write reminder to google doc for a given 'ingredient'
def make_one_reminder(gdoc, meal, ingredient):
    # days_before is set to 10 in csv if reminder is for same day
    if int(ingredient.days_before_action) >= 10:
        ingredient.days_before_action = 0

    start_j, end_j = gdoc.get_text_range_idx('Reminders', False)
    reminder_msg = ingredient.reminder_message(meal)
    gdoc.insert_text(end_j, reminder_msg, True)

# write the week a meal is being made in Meals sheet
def update_meal_date(meals_df, meal, gsheet):
    # write week date to meals
    meals_df.loc[str(meal_id), 'week'] = week_date.strftime("%m-%d-%y")

    # get week column from dataframe
    date_values = np.reshape(meals_df.loc[:,'week'].values.tolist(),
        (len(meals_df.index), 1))
    date_length = len(meals_df.index)

    # write week to google sheet
    sheet_range = 'Meals!D2:D{}'.format(date_length+1)
    data = date_values.tolist()
    gsheet.write_data(sheet_range, data)

# write reminders in google doc and update meal date in csv given meals for week
def make_reminders(meal_batch, gdoc, gsheet):
    # Open Meals and ingredients tables
    meals_data = gsheet.pull_sheet_data('Meals')
    meals_df = pd.DataFrame(meals_data[1:], columns=meals_data[0])
    meals_df = meals_df.set_index('id')
    ingredients_data = gsheet.pull_sheet_data('Ingredients')
    ingredients_df = pd.DataFrame(ingredients_data[1:], columns=ingredients_data[0])

    i = 0
    # loop through meals
    for meal_id in meal_batch.ids:
        # create meal object
        meal_name = meals_df.loc[str(meal_id), 'name']
        meal_rank = meals_df.loc[str(meal_id), 'rank']
        meal_day = meal_batch.week_date + timedelta(days=i)
        i+=1
        meal_abbrev = meals_df.loc[str(meal_id), 'abbrev']
        meal_extra = meals_df.loc[str(meal_id), 'extra']
        meal_notes = meals_df.loc[str(meal_id), 'notes']
        meal = Meal(meal_id, meal_name, meal_rank, meal_batch.week_date, meal_day,
            meal_abbrev, meal_extra, meal_notes)

        update_meal_date(meals_df, meal, gsheet)

        # loop through meal ingredients
        for index,row in ingredients_df[ingredients_df['id']==str(meal_id)].iterrows():
            # create ingredient object
            ingredient_name = row['name']
            section = row['section']
            days_before = row['days_before_action']
            action = row['action']
            time = row['time']
            notify_who = row['notify_who']
            notify_when = row['notify_when']
            ingredient = Ingredient(meal_id, ingredient_name, section,
                days_before, action, time, notify_who, notify_when)

            # create reminder in google doc if ingredient needs a reminder
            if int(days_before) > 0:
                make_one_reminder(gdoc, meal, ingredient)
