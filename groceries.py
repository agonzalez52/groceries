#
# Version 1.1.0
#
# Created By: Angel Gonzalez
#

from __future__ import print_function
import pickle
import os.path
import json
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pandas as pd
from datetime import date
from datetime import timedelta

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/drive']

# The ID of a sample document.
DOCUMENT_ID = '195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE'

# color codes for text
red = [0.0,0.0,1.0]
green = [0.0,1.0,0.0]
blue = [1.0,0.0,0.0]
black = [0.0,0.0,0.0]
yellow = [0.0,1.0,1.0]

def main():
    """Shows basic usage of the Docs API.
    Prints the title of a sample document.
    """
    creds = None
    # The file token.pickle stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    service = build('docs', 'v1', credentials=creds)
    return service

    # Retrieve the documents contents from the Docs service.
    #document = service.documents().get(documentId=DOCUMENT_ID).execute()

    #print('The title of the document is: {}'.format(document.get('title')))

def create_document(service):
    title = 'Automated Groceries'
    body = {
        'title': title
    }
    doc = service.documents().create(body=body).execute()
    print('Created document with title: {0}'.format(doc.get('title')))

    return doc

def get_text_range_idx(service, doc_id, match_text, do_print):
    """
    Find text and their start and end index.
    """

    # Do a document "get" request and print the results as formatted JSON
    result = service.documents().get(documentId=doc_id).execute()

    with open('data.json', 'w') as f:
        json.dump(result, f, indent=4)
    data = result.get('body').get('content')
    startIdx = 0
    endIdx = 0

    for d in data:
        para = d.get('paragraph')
        if para is None:
            continue
        else:
            elements = para.get('elements')
            for e in elements:
                if e.get('textRun'):
                    content = e.get('textRun').get('content')
                    # added to exactly match section name
                    if match_text == content or match_text == content.strip('\n'):
                        if do_print:
                            print(match_text)
                        startIdx = e.get('startIndex')
                        endIdx = e.get('endIndex')
                        # added because sometimes section title and its '\n' are separated into two elements
                        # if there is one element in the paragraph then the text will be "Health\n"
                        # if there are two elements in the paragraph then one element will be "Health"
                        # and the other will be "\n"
                        if len(elements) > 1:
                            endIdx+=1

    return startIdx, endIdx

def insert_text(service, doc_id, startIndex, item, color, do_print):
    """
    Inserts texts followed by newline. Formats text.
    Use case: startIndex should be endIndex of the name of the section
    """
    # Write item under its section
    requests_insert = [
         {
            'insertText': {
                'location': {
                    'index': startIndex,
                },
                'text': item+'\n'
            }
        }
    ]
    #print('inserted '+item+' at index '+str(startIndex))

    # Format text
    requests_format = [
        # Remove bold from item text
        {
            'updateTextStyle': {
                'range':{
                    'startIndex': startIndex,
                    'endIndex': startIndex+len(item)
                },
                'textStyle': {
                    'bold': False
                },
                'fields': 'bold'
            }
        },
        # Set item text to black
        {
            'updateTextStyle': {
                'range': {
                    'startIndex': startIndex,
                    'endIndex': startIndex+len(item)
                },
                'textStyle': {
                    'foregroundColor': {
                        'color': {
                            'rgbColor': {
                                'blue': color[0],
                                'green': color[1],
                                'red': color[2]
                            }
                        }
                    }
                },
                'fields': 'foregroundColor'
            }
        }
    ]

    result1 = service.documents().batchUpdate(documentId=doc_id, body={'requests': requests_insert}).execute()
    if do_print:
        print('    '+item)
    result2 = service.documents().batchUpdate(documentId=doc_id, body={'requests': requests_format}).execute()

# loop through ingredients for meal 'id' and add to doc
def write_ingredients_to_doc(service, doc, Ingredients, id, Meal_abbrev,
    Meal_name, meal_day):
    # get all the ingredients for the meal and write them to doc
    for index,row in Ingredients[Ingredients['id']==id].iterrows():
        # get ingredient, section name, and days before take down
        ingredient = row['name']
        section = row['section']
        days_before = row['days_before_action']
        action = row['action']
        time = row['time']
        notify_who = row['notify_who']
        notify_when = row['notify_when']

        # insert ingredient to google doc
        start_i, end_i = get_text_range_idx(service, doc, section, True)
        insert_text(service, doc, end_i, ingredient+' '+Meal_abbrev, yellow,
            True)

        # create reminder in google doc if ingredient needs a reminder
        if days_before > 0:
            make_one_reminder(service, doc, meal_day, days_before, action,
                ingredient, time, notify_who, notify_when,
                Meal_name)

# add ingredients to google doc given the id's to the meals
def update_grocery_list(ids, service, doc, week_date, test_run=0):
    # Open Meals and Ingredients tables
    Meals = pd.read_csv('Meals Table.csv', index_col='id')
    Ingredients = pd.read_csv('Ingredients Table.csv')

    meals_file = open("logs/Meal Schedule "+week_date.strftime("%m-%d-%y")+'.txt'
        ,"w")

    i = 0
    # loop through meals
    for id in ids:
        if test_run<=0:
            update_meal_date(Meals, week_date, id)

        # meal_day = day meal is being made
        meal_day = week_date + timedelta(days=i)
        i+=1

        # get csv values from Meal
        Meal_name = Meals.loc[id, 'name']
        print('---------------------------------------------------------------')
        print('MEAL: '+Meal_name)
        meals_file.write(meal_day.strftime("%A, %m/%d")+'\n'+Meal_name+'\n\n')
        Meal_abbrev = Meals.loc[id, 'abbrev']
        Meal_extra = Meals.loc[id, 'extra']

        write_ingredients_to_doc(service, doc, Ingredients, id, Meal_abbrev,
        Meal_name, meal_day)

        if isinstance(Meal_extra, str):
            # insert Extras at end of doc
            start_i, end_i = get_text_range_idx(service, doc, 'Extra', True)
            insert_text(service, doc, end_i, Meal_name+'\n'+str(Meal_extra)+'\n'
                , yellow, True)

    meals_file.close()

# write reminders in google doc and update meal date in csv given meals for week
def make_reminders(ids, service, doc, week_date):
    # Open Meals and Ingredients tables
    Meals = pd.read_csv('Meals Table.csv', index_col='id')
    Ingredients = pd.read_csv('Ingredients Table.csv')

    i = 0
    # loop through Meals
    for meal in ids:
        update_meal_date(Meals, week_date, meal)

        # meal_day = day meal is being made
        meal_day = week_date + timedelta(days=i)
        i+=1

        # get csv values for Meal
        Meal_name = Meals.loc[meal, 'name']

        # loop through meal ingredients
        for index,row in Ingredients[Ingredients['id']==id].iterrows():
            ingredient = row['name']
            days_before = row['days_before_action']
            action = row['action']
            time = row['time']
            notify_who = row['notify_who']
            notify_when = row['notify_when']

            # create reminder in google doc if ingredient needs a reminder
            if days_before > 0:
                make_one_reminder(service, doc, meal_day, days_before, action,
                                    ingredient, time, notify_who, notify_when,
                                    Meal_name)

# write reminder to google doc for a given 'ingredient'
def make_one_reminder(service, doc, meal_day, days_before, action,
                        ingredient, time, notify_who, notify_when, meal_name):
    # days_before is set to 10 in csv if reminder is for same day
    if days_before >= 10:
        days_before = 0
    start_j, end_j = get_text_range_idx(service, doc, 'Reminders', False)
    insert_text(service, doc, end_j, meal_name+' ('+meal_day.strftime("%a")+
        ') - '+action+' '+ingredient+' '+'on '+
        (meal_day-timedelta(days_before)).strftime("%A, %m-%d-%y")+' at '
        +time+' in Family calendar. Add '+notify_who+', notify at '+notify_when+
        ', default color, on private\n', yellow, False)

# write the week a meal is being made in Meals sheet
def update_meal_date(Meals, week_date, meal):
    # write week date to Meals
    Meals.loc[meal, 'week'] = week_date.strftime("%m-%d-%y")

    # write week to csv
    Meals.to_csv('Meals Table.csv')

if __name__ == '__main__':
    service = main()
    # to create initial doc
    #doc = create_document(service)
    doc = "1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA"

    start_date = date(2021, 1, 11)
    update_grocery_list([1,2,16], service, doc, start_date, 1) # TEST RUN

    print('\n\ndone =) \"Have a lovely day!\"\n\n')
