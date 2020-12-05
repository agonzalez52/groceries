#
# Version 1.0.0
#
from __future__ import print_function
import pickle
import os.path
import json
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pandas as pd

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/drive']

# The ID of a sample document.
DOCUMENT_ID = '195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE'

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

def get_text_range_idx(service, doc_id, match_text):
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

def insert_text(service, doc_id, startIndex, item):
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
                                'blue': 0.0,
                                'green': 0.0,
                                'red': 0.0
                            }
                        }
                    }
                },
                'fields': 'foregroundColor'
            }
        }
    ]

    result1 = service.documents().batchUpdate(documentId=doc_id, body={'requests': requests_insert}).execute()
    print('    '+item)
    result2 = service.documents().batchUpdate(documentId=doc_id, body={'requests': requests_format}).execute()

# add ingredients to google doc given the id's to the meals
def update_grocery_list(ids, service, doc):
    # Open Meals and Ingredients tables
    Meals = pd.read_csv('Meals Table.csv', index_col='id')
    Ingredients = pd.read_csv('Ingredients Table.csv')

    for id in ids:
        # update this_time, last_time variables
        if Meals.loc[id, 'this_time'] == 1:
            Meals.loc[id, 'last_time'] = 1
        else:
            Meals.loc[id, 'this_time'] = 1
            Meals.loc[id, 'last_time'] = 0

        # write updated this_time, last_time values to csv
        Meals.to_csv('Meals Table.csv')

        # get the meal name
        Meal_name = Meals.loc[id, 'name']
        print('MEAL: '+Meal_name)

        # get the meal abbreviation
        Meal_abbrev = Meals.loc[id, 'abbrev']

        # get all the ingredients for the meal and write them to doc
        for index,row in Ingredients[Ingredients['id']==id].iterrows():
            # get ingredient and section name
            ingredient = row['name']
            section = row['section']

            # insert text to google doc
            start_i, end_i = get_text_range_idx(service, doc, section)
            insert_text(service, doc, end_i, ingredient+' '+Meal_abbrev)
        print('Completed'+'\n')

if __name__ == '__main__':
    service = main()
    #doc = create_document(service)
    doc = "1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA"

    update_grocery_list([19,20], service, doc)
    # 6,35,42,25,24,1

    # INSERT TEXT TEST
    # start_h, end_h = get_text_range_idx(service, doc, "Health")
    # #print('end_h: '+str(end_h))
    # insert_text(service, doc, end_h, 'floss')
    #
    # start_c, end_c = get_text_range_idx(service, doc, "Carne")
    # #print('end_c: '+str(end_c))
    # insert_text(service, doc, end_c, 'chicken (3lb)')
    #
    # start_cagain, end_cagain = get_text_range_idx(service, doc, "Carne")
    # insert_text(service, doc, end_cagain, 'ground beef')
    #
    # start_o, end_o = get_text_range_idx(service, doc, "Hot stuff")
    # insert_text(service, doc, end_o, 'chicken wings')

    # CSV TEST
    # Meals = pd.read_csv('Meals Table.csv', index_col='id')
    # Ingredients = pd.read_csv('Ingredients Table.csv')
    #
    # curr_id = 1;
    #
    # # update this_time, last_time variables
    # if Meals.loc[curr_id, 'this_time'] == 1:
    #     Meals.loc[curr_id, 'last_time'] = 1
    # else:
    #     Meals.loc[curr_id, 'this_time'] = 1
    #     Meals.loc[curr_id, 'last_time'] = 0
    #
    # # get meal name corresponding to the specified id
    # Meal_name = Meals.loc[curr_id, 'name']
    #
    # # loops through rows with specified id and prints out the ingredient name/
    # # section
    # for index,row in Ingredients[Ingredients['id']==curr_id].iterrows():
    #     print('Name: '+row['name']+' Section: '+row['section'])
    #
    # Meals.to_csv('Meals Table.csv')

    print('done')
