# !/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on: Wed 01 Dec 2021 15:32:54
Description: Get day of week from a given date

@author: tsenoner
"""
from db_api import Database
from gui import GUI


def main():
    with Database("log") as db:
        GUI(db)


if __name__ == "__main__":
    main()
