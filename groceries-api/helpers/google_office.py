from __future__ import print_function
import pickle
import os.path
import json
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.errors import HttpError
from df2gspread import df2gspread as d2g
from datetime import date
from datetime import timedelta
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.audio import MIMEAudio
from email.mime.base import MIMEBase
import mimetypes
import base64
import helpers.color_codes as colors
from google.cloud import secretmanager
import google_crc32c
from dotenv import load_dotenv

load_dotenv()
LOCAL_ENV = os.getenv("LOCAL_ENV", "True").lower() in ("true","1","t")
GOOGLE_PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID")
GOOGLE_TOKEN_SECRET_ID = os.getenv("GOOGLE_TOKEN_SECRET_ID")
CREDENTIALS_DIR = os.getenv("CREDENTIALS_DIR", "credentials")
CREDENTIALS_FILE = os.path.join(CREDENTIALS_DIR, "credentials.json")
TOKEN_FILE = os.path.join(CREDENTIALS_DIR, "token.pickle")
REMINDERS = os.getenv("REMINDERS")
if REMINDERS:
    REMINDERS_DICT = json.loads(REMINDERS)
else:
    print("REMINDERS env var was not found or is empty")
DINNER_ATTENDEES = os.getenv("DINNER_ATTENDEES")
if DINNER_ATTENDEES:
    DINNER_ATTENDEES_DICT = json.loads(DINNER_ATTENDEES)
else:
    print("DINNER_ATTENDEES env var was not found or is empty")

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/gmail.send']

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

    def get_text_range_idx(self, match_text, is_api_run):
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
                            if not is_api_run:
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

    def insert_text(self, startIndex, item, is_api_run):
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
            # Set item text to self.font_color
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
            },
            # remove bullet formatting if there
            {
                'deleteParagraphBullets': {
                    'range': {
                        'startIndex': startIndex,
                        'endIndex': startIndex+len(item)
                    }
                }
            }
        ]

        result1 = self.service.documents().batchUpdate(documentId=self.id, body={
            'requests': requests_insert}).execute()
        if not is_api_run:
            print('    '+item)
        result2 = self.service.documents().batchUpdate(documentId=self.id, body={
            'requests': requests_format}).execute()

    def insert_checklist_item(self, startIndex, item, is_api_run):
        requests = []
        requests.append({
            'insertText': {
                'location': {
                    'index': startIndex
                },
                'text': f"{item}\n"
            }
        })
        requests.append({
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
        })
        requests.append({
            'createParagraphBullets': {
                'range': {
                    'startIndex': startIndex,
                    'endIndex': startIndex+len(item)
                },
                'bulletPreset': 'BULLET_CHECKBOX',
            }
        })
        requests.append({
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
        })

        result = self.service.documents().batchUpdate(documentId=self.id, body={'requests': requests}).execute()
        if not is_api_run:
            print('    '+item)

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

    def get_attendees_from_dict(self, attendees):
        attendee_list = []

        for attendee_email in attendees.values():
            attendee_dict = {'email': attendee_email}
            attendee_list.append(attendee_dict)

        return attendee_list
    
    def get_attendees_from_name(self, attendees):
        split_attendees = attendees.split(',')
        attendee_list = []

        for attendee in split_attendees:
            attendee_email = DINNER_ATTENDEES_DICT[attendee.strip()]
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

    def create_ingredient_event(self, meal, ingredient, is_api_run):
        # event name
        summary = f'{ingredient.action} {ingredient.name} ({meal.name})'
        # event start/end dateTime for ingredient
        start_time = datetime.strptime(ingredient.time,'%I:%M %p').time()
        end_time = (datetime.strptime(ingredient.time,'%I:%M %p')+timedelta(hours=1)).time()
        start_date_time = f'{meal.day-timedelta(int(ingredient.days_before_action))}T{start_time}' # Format time as yyyy-mm-ddTHH:mm:ss
        end_date_time = f'{meal.day-timedelta(int(ingredient.days_before_action))}T{end_time}' # Format time as yyyy-mm-ddTHH:mm:ss
        # event attendees
        attendees = self.get_attendees_from_name(ingredient.notify_who)
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
            'colorId': colors.EVENT_SAGE,
            'guestsCanModify': True,
            'source': { # Source from which the event was created
                'title': 'Groceries Program',
                'url': 'https://github.com/agonzalez52/groceries'
            },
            'transparency': 'transparent' # Does not 'show as busy' during event time
        }

        event = self.service.events().insert(calendarId=self.id, body=event).execute()
        if not is_api_run:
            print(f"    Event created on {meal.day-timedelta(int(ingredient.days_before_action))} to {ingredient.action} {ingredient.name}")

    def create_dinner_event(self, meal, dinner_attendees, is_api_run):
        # event name
        summary = f'{meal.name} for dinner'

        # event start/end dateTime for dinner reminder
        dinner_start_date = datetime.strptime(f'{meal.day}','%Y-%m-%d').date() # Format date as yyyy-mm-dd
        dinner_end_date = (datetime.strptime(f'{meal.day}','%Y-%m-%d')+timedelta(days=1)).date() # end date must be the next day for all-day event

        # helpful reference links for event description
        food_for_week_doc_link = 'https://docs.google.com/document/d/1j2HUVs1Rwm2eemLie3qiHGDNazYtaXIYsPhcjjaBjrQ/edit'
        ingredients_sheet_link = 'https://docs.google.com/spreadsheets/d/1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU/edit?gid=150359050#gid=150359050'
        recipes_doc_link = 'https://docs.google.com/document/d/19m9f15dyRHk8bPnnyu-ieBGuhtir1zZBEUIjHfmYabY/edit'
        # HTML formatted links to helpful docs for event description
        description_reference_links = (f'<a href={ingredients_sheet_link}>Ingredients Sheet</a> - id: {meal.id}\n\n'
                                       f'<a href={recipes_doc_link}>Recipes</a>\n\n'
                                       f'<a href={food_for_week_doc_link}>Food For Week</a>\n\n')
        # get date (today) event was created for event description
        event_created_date = date.today().strftime('Event created on %A, %m/%d/%Y') # format date as 'Monday 7/14/2012'
        
        # add meal notes to event description if available
        event_description = description_reference_links
        if isinstance(meal.notes, str) and meal.notes != 'N/A':
            event_description += f'Notes:\n{meal.notes}\n\n'+event_created_date
        else:
            event_description += event_created_date

        # event attendees
        attendees = self.get_attendees_from_dict(dinner_attendees)
        event = {
            'summary': summary,
            'description': event_description,
            'start': {
                'date': f'{dinner_start_date}',
                'timeZone': 'America/Los_Angeles',
            },
            'end': {
                'date': f'{dinner_end_date}',
                'timeZone': 'America/Los_Angeles',
            },
            'reminders': {
                'useDefault': False,  # Do not use default reminders
                'overrides': []  # No reminders
            },
            'attendees': attendees,
            'colorId': colors.EVENT_LAVENDER,
            'guestsCanModify': True,
            'source': { # Source from which the event was created
                'title': 'Groceries Program',
                'url': 'https://github.com/agonzalez52/groceries'
            },
            'transparency': 'transparent' # Does not 'show as busy' during event time
        }

        event = self.service.events().insert(calendarId=self.id, body=event).execute()
        if not is_api_run:
            print(f"All day event created for {meal.name} on {meal.day}\n")

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
        except HttpError as error:
            print('An error occurred: %s' % error)

def access_secret_version(
    project_id: str, secret_id: str, version_id="latest"
) -> secretmanager.AccessSecretVersionResponse:
    """
    Access the payload for the given secret version if one exists. The version
    can be a version number as a string (e.g. "5") or an alias (e.g. "latest").
    """

    # Create the Secret Manager client.
    client = secretmanager.SecretManagerServiceClient()

    # Build the resource name of the secret version.
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"

    # Access the secret version.
    response = client.access_secret_version(request={"name": name})

    # Verify payload checksum.
    crc32c = google_crc32c.Checksum()
    crc32c.update(response.payload.data)
    if response.payload.data_crc32c != int(crc32c.hexdigest(), 16):
        print("Data corruption detected.")
        return response

    # snippet is showing how to access the secret material.
    return response.payload.data

def build_services():
    creds = None

    if LOCAL_ENV:
        # The file token.pickle stores the user's access and refresh tokens, and is
        # created automatically when the authorization flow completes for the first
        # time.
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE, 'rb') as token:
                creds = pickle.load(token)
        # If there are no (valid) credentials available, let the user log in.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    CREDENTIALS_FILE, SCOPES)
                creds = flow.run_local_server(port=0)
            # Save the credentials for the next run
            with open(TOKEN_FILE, 'wb') as token:
                pickle.dump(creds, token)
    else:
        creds = pickle.loads(access_secret_version(GOOGLE_PROJECT_ID, GOOGLE_TOKEN_SECRET_ID))

    doc_service = build('docs', 'v1', credentials=creds)
    sheet_service = build('sheets', 'v4', credentials=creds)
    calendar_service = build('calendar', 'v3', credentials=creds)
    mail_service = build('gmail', 'v1', credentials=creds)

    return doc_service, sheet_service, calendar_service, mail_service
