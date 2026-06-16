# !/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on: Wed 01 Dec 2021 16:42:57
Description: API to database

@author: tsenoner
"""
import datetime
import sqlite3
from pathlib import Path
from typing import Iterable, List


class Database:
    path_db: str = ":memory:"

    con: bool = None
    cur: bool = None

    def __init__(self, db_name: str = None) -> None:
        if db_name is not None:
            self.path_db = Path(__file__).parents[1] / "data" / f"{db_name}.db"
        self.__connect()
        self.__create_table()

    def __enter__(self) -> "Database":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def close(self):
        try:
            self.con.close()
        except AttributeError:
            print("Not closable.")
            return True  # exception handled successfully

    def __connect(self) -> None:
        self.con = sqlite3.connect(self.path_db,
                                   detect_types=sqlite3.PARSE_DECLTYPES |
                                   sqlite3.PARSE_COLNAMES)
        self.cur = self.con.cursor()

    def __create_table(self) -> None:
        create_table_query = """
            CREATE TABLE IF NOT EXISTS dates (
                time timestamp,
                date date,
                real_day TEXT,
                guessed_day TEXT,
                correct NULL);
            """
        self.__execute(create_table_query)

    def __execute(self, query: str, parms: Iterable = ()) -> None:
        with self.con:
            return self.cur.execute(query, parms)

    def insert(self, date: datetime.date, real_day: str, guessed_day: str) -> None:
        insert_data = """
            INSERT INTO dates
                VALUES (:time, :date, :real_day, :guessed_day, :correct);
            """
        current_time = datetime.datetime.now()
        correct = real_day == guessed_day
        data_tuple = (current_time, date, real_day, guessed_day, correct)
        self.__execute(insert_data, data_tuple)

    def is_not_empty(self, table: str = "dates"):
        querry = "SELECT EXISTS(SELECT 1 FROM dates LIMIT 1);"
        self.__execute(querry)  # , (table,))
        return self.cur.fetchone()[0]

    def get_data(self, querry: str) -> List[tuple]:
        self.__execute(querry)
        recs = self.cur.fetchall()
        return recs

    def get_all_data(self) -> List[tuple]:
        self.cur.execute("SELECT rowid, * FROM dates")
        recs = self.cur.fetchall()
        return recs

    def get_last_inserted_rec(self) -> tuple:
        rowid = self.cur.lastrowid
        query = "SELECT rowid, * FROM dates WHERE rowid = (?)"
        self.__execute(query, (str(rowid),))
        rec = self.cur.fetchone()
        return rec

    def delete_row(self, rowid: int) -> None:
        query = "DELETE from dates WHERE rowid = (?)"
        self.__execute(query, str(rowid))


def main():
    with Database() as db:
        db.is_not_empty()
        db.insert(datetime.date(1994, 7, 30), "saturday", "saturday")
        db.is_not_empty()
        db.insert(datetime.date(1994, 7, 30), "saturday", "friday")
        db.insert(datetime.date(1994, 7, 30), "saturday", "monday")
        rec = db.get_last_inserted_rec()
        print(rec)
        # db.delete_row(2)
        recs = db.get_all_data()
    for rec in recs:
        print(rec)

    # db = Database()
    # db.insert(datetime.date(1994, 7, 30), "saturday", "saturday")
    # db.insert(datetime.date(1994, 7, 30), "saturday", "friday")
    # recs = db.get_all_data()
    # db.close()
    # for rec in recs:
    #     print(rec)


if __name__ == "__main__":
    main()
