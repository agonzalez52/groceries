from __future__ import print_function
import pickle
import os.path
import json
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.errors import HttpError
from df2gspread import df2gspread as d2g
from datetime import time
from datetime import timedelta
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.audio import MIMEAudio
from email.mime.base import MIMEBase
import mimetypes
import base64

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/gmail.send']

ATTENDEES_DICT = {
    'Angel': 'angelmg58@gmail.com',
    'Fernando': 'fgonzalez55555@gmail.com',
    'Arturo': 'jesusgong333@gmail.com'
}

REMINDERS_DICT = {
    '2 hours before as email': ['email', '120'],
    '2 hours before': ['popup', '120'],
    '1 hour before': ['popup', '60'],
    'at time of event': ['popup', '0']
}

class GoogleAPI:
    def __init__(self, g_doc, g_sheet, g_calendar, g_mail):
        self.gdoc = g_doc
        self.gsheet = g_sheet
        self.gcalendar = g_calendar
        self.gmail = g_mail

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
    def __init__(self, calendar_id, calendar_service):
        self.service = calendar_service
        self.id = calendar_id

    def get_calendars(self):
        page_token = None
        while True:
          calendar_list = self.service.calendarList().list(pageToken=page_token).execute()
          for calendar_list_entry in calendar_list['items']:
            print(calendar_list_entry['summary']+' id: '+calendar_list_entry['id'])
          page_token = calendar_list.get('nextPageToken')
          if not page_token:
            break

    def get_attendees(self, attendees):
        split_attendees = attendees.split(',')
        attendee_list = []

        for attendee in split_attendees:
            attendee_email = ATTENDEES_DICT[attendee.strip()]
            attendee_dict = {'email': attendee_email}
            attendee_list.append(attendee_dict)

        return attendee_list

    def get_reminders(self, reminders):
        split_reminders = reminders.split(',')
        reminder_list = []

        for reminder in split_reminders:
            reminder_method = REMINDERS_DICT[reminder.strip()][0]
            reminder_trigger = REMINDERS_DICT[reminder.strip()][1]
            reminder_dict = {'method': reminder_method, 'minutes': int(reminder_trigger)}
            reminder_list.append(reminder_dict)

        return reminder_list

    def create_event(self, meal, ingredient):
        # event summary
        summary = f'{ingredient.action} {ingredient.name} ({meal.name})'
        # event start/end dateTime
        start_time = datetime.strptime(ingredient.time,'%I:%M %p').time()
        end_time = (datetime.strptime(ingredient.time,'%I:%M %p')+timedelta(hours=1)).time()
        start_date_time = f'{meal.day-timedelta(int(ingredient.days_before_action))}T{start_time}'
        end_date_time = f'{meal.day-timedelta(int(ingredient.days_before_action))}T{end_time}'
        # event attendees
        attendees = self.get_attendees(ingredient.notify_who)
        # event reminders
        reminders = self.get_reminders(ingredient.notify_when)

        event = {
            'summary': summary,
            'start': {
                'dateTime': start_date_time,
                'timeZone': 'America/Los_Angeles',
            },
            'end': {
                'dateTime': end_date_time,
                'timeZone': 'America/Los_Angeles',
            },
            'attendees': attendees,
            'reminders': {
                'useDefault': False,
                'overrides': reminders,
            },
        }

        event = self.service.events().insert(calendarId=self.id, body=event).execute()
        print(f"    Event created on {start_date_time}: {event.get('htmlLink')}")

class GoogleMail:
    def __init__ (self, gmail_service):
        self.service = gmail_service

    def create_message_with_attachment(self, sender, to, subject, message_text, file_path):
        message = MIMEMultipart()
        message['to'] = to
        message['from'] = sender
        message['subject'] = subject

        msg = MIMEText(message_text)
        message.attach(msg)

        content_type, encoding = mimetypes.guess_type(file_path)

        if content_type is None or encoding is not None:
            content_type = 'application/octet-stream'
        main_type, sub_type = content_type.split('/', 1)
        if main_type == 'text':
            fp = open(file_path, 'r')
            msg = MIMEText(fp.read(), _subtype=sub_type)
            fp.close()
        elif main_type == 'image':
            fp = open(file_path, 'rb')
            msg = MIMEImage(fp.read(), _subtype=sub_type)
            fp.close()
        elif main_type == 'audio':
            fp = open(file_path, 'rb')
            msg = MIMEAudio(fp.read(), _subtype=sub_type)
            fp.close()
        else:
            fp = open(file_path, 'rb')
            msg = MIMEBase(main_type, sub_type)
            msg.set_payload(fp.read())
            fp.close()
        filename = os.path.basename(file_path)
        msg.add_header('Content-Disposition', 'attachment', filename=filename)
        message.attach(msg)

        return {'raw': base64.urlsafe_b64encode(message.as_bytes()).decode()}

    def send_message(self, user_id, message):
        try:
            message = (self.service.users().messages().send(userId=user_id, body=message)
                       .execute())
            return message
        except(HttpError, error):
            print('An error occurred: %s' % error)


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
    mail_service = build('gmail', 'v1', credentials=creds)

    return doc_service, sheet_service, calendar_service, mail_service
