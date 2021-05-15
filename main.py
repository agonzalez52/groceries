import groceries
import kivy
kivy.require('2.0.0')

from kivy.app import App
from kivy.uix.button import Button
from kivy.uix.gridlayout import GridLayout
from datetime import date

class HomeScreen(GridLayout):
    def __init__(self, **kwargs):
        super(HomeScreen, self).__init__(**kwargs)

        self.cols = 1

        # 'Add Groceries' Button
        self.addGroceriesButton = Button(text='Add Groceries', font_size=30)
        self.addGroceriesButton.bind(on_press=self.pressAddGroceriesButton)
        self.add_widget(self.addGroceriesButton)

    def pressAddGroceriesButton(self, instance):
        print("Adding Groceries...")
        
        service = groceries.main()
        doc = "1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA"

        start_date = date(2021, 1, 11)
        groceries.update_grocery_list([1,2,16], service, doc, start_date, 1)

        print("Added Groceries!")

class GroceryApp(App):
    def build(self):
        return HomeScreen()

if __name__ == '__main__':
    GroceryApp().run()
