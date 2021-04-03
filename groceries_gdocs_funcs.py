from __future__ import print_function
import pickle
import os.path
import json
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from df2gspread import df2gspread as d2g
import groceries_funcs as grc

doc_id = "1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA"
sheet_id = "1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU"

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/drive']

# The ID of a sample document.
DOCUMENT_ID = '195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE'

creds = None

def build_services():
    """Shows basic usage of the Docs API.
    Prints the title of a sample document.
    """
    #creds = None
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

    doc_service = build('docs', 'v1', credentials=creds)
    sheet_service = build('sheets','v4',credentials=creds)
    return doc_service, sheet_service

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

def get_text_range_idx(doc_service, match_text, do_print):
    """
    Find text and their start and end index.
    """

    # Do a document "get" request and print the results as formatted JSON
    result = doc_service.documents().get(documentId=doc_id).execute()

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

def insert_text(doc_service, startIndex, item, color, do_print):
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

    result1 = doc_service.documents().batchUpdate(documentId=doc_id, body={'requests': requests_insert}).execute()
    if do_print:
        print('    '+item)
    result2 = doc_service.documents().batchUpdate(documentId=doc_id, body={'requests': requests_format}).execute()

def pull_sheet_data(sheet_service, tab):
    sheet = sheet_service.spreadsheets()
    result = sheet.values().get(spreadsheetId=sheet_id,range=tab).execute()
    values = result.get('values',[])

    if not values:
        print('No data found')
    else:
        rows = sheet.values().get(spreadsheetId=sheet_id,range=tab).execute()

    data = rows.get('values')
    return data
