from datetime import timedelta

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
