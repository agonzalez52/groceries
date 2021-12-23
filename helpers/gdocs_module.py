from __future__ import print_function
import pickle
import os.path
import json
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from df2gspread import df2gspread as d2g

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/calendar']

FAMILY_CALENDAR_ID = 'family05728506763710474802@group.calendar.google.com'

class GoogleDoc:
    def __init__(self, doc_id, doc_service):
        self.id = doc_id
        self.service = doc_service

    def set_font_color(self, font_color):
        self.font_color = font_color

    def get_font_color(self):
        return self.font_color

    def create_document(self):
        title = 'Automated Groceries'
        body = {
            'title': title
        }
        doc = self.service.documents().create(body=body).execute()
        print('Created document with title: {0}'.format(doc.get('title')))

        return doc

    def get_text_range_idx(self, match_text, do_print):
        """
        Find text and their start and end index.
        """

        # Do a document "get" request and print the results as formatted JSON
        result = self.service.documents().get(documentId=self.id).execute()

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

    def insert_text(self, startIndex, item, do_print):
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
                                    'blue': self.font_color[0],
                                    'green': self.font_color[1],
                                    'red': self.font_color[2]
                                }
                            }
                        }
                    },
                    'fields': 'foregroundColor'
                }
            }
        ]

        result1 = self.service.documents().batchUpdate(documentId=self.id, body={
            'requests': requests_insert}).execute()
        if do_print:
            print('    '+item)
        result2 = self.service.documents().batchUpdate(documentId=self.id, body={
            'requests': requests_format}).execute()

class GoogleSheet:
    def __init__(self, sheet_id, sheet_service):
        self.id = sheet_id
        self.service = sheet_service

    def pull_sheet_data(self, tab):
        sheet = self.service.spreadsheets()
        result = sheet.values().get(spreadsheetId=self.id,range=tab).execute()
        values = result.get('values',[])

        if not values:
            print('No data found')
        else:
            rows = sheet.values().get(spreadsheetId=self.id,range=tab).execute()

        data = rows.get('values')
        return data

    def write_data(self, sheet_range, data):
        response_date = self.service.spreadsheets().values().update(
            spreadsheetId=self.id,
            valueInputOption='USER_ENTERED',
            range=sheet_range,
            body=dict(
                majorDimension='ROWS',
                values=data)
        ).execute()

class GoogleCalendar:
    def __init__(self, calendar_service):
        self.service = calendar_service

    def get_calendars(self):
        page_token = None
        while True:
          calendar_list = self.service.calendarList().list(pageToken=page_token).execute()
          for calendar_list_entry in calendar_list['items']:
            print(calendar_list_entry['summary']+' id: '+calendar_list_entry['id'])
          page_token = calendar_list.get('nextPageToken')
          if not page_token:
            break

def build_services():
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

    doc_service = build('docs', 'v1', credentials=creds)
    sheet_service = build('sheets', 'v4', credentials=creds)
    calendar_service = build('calendar', 'v3', credentials=creds)

    return doc_service, sheet_service, calendar_service
