/*
 * MIT License
 *
 * Copyright (c) 2020 Dylan Hackworth
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import * as sqlite3 from 'sqlite3';

export type StoredResponseEvent = {
  responseID: string
}

/**
 * This database controller allows DadBot to save and refer to events that it responded to. The
 * database being managed has table called "events" which has two columns. An eventsID column
 * which has the ID of the event that has been responded too (ie "Hi NAME, I'm Dad.") and the
 * second column is the responseID which is the ID of the response (ie "HI NAME, I'm Dad."'s ID).
 */
export class DBController {
  // Table identifiers
  private static readonly tableName = 'events';
  private static readonly responseColumn = 'responseID';
  private static readonly eventColumn = 'eventID';

  // This declares that the database is ready
  private isReady = false;
  private readonly db: sqlite3.Database;

  public constructor(dbName: string) {
    // This will automatically create the database if it doesn't already exist.. If there's an
    // issue with creating the db then it's out of our control and up to the instance host to
    // fix it. The only errors accounted for are errors for querying data.
    this.db = new sqlite3.Database(dbName);
  }

  /**
   * This adds a pair of eventID and it's responseID to the database
   * @param {string} eventId
   * @param {string} responseId
   * @returns {Promise<void>}
   */
  public addEventID(eventId: string, responseId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // Was <DBController>.start() called?
      if (!this.isReady)
        await this.start();

      // If the database is ready then insert the pair into the database events table
      this.db.run(`INSERT INTO ${DBController.tableName} VALUES (?, ?)`,
        [eventId, responseId],
        (err: Error | null) => err ? reject(err) : resolve());
    });
  }

  /**
   * This gets the responseID of an eventID (it's possible for the returned value to be undefined)
   * @param {string} eventId
   * @returns {Promise<string|undefined>}
   */
  public getEventID(eventId: string): Promise<string | undefined> {
    return new Promise(async (resolve, reject) => {
      // Was <DBController>.start() called?
      if (!this.isReady)
        await this.start();

      // Prepare to grab the responseID from the database table.
      const prep = this.db.prepare(
        `SELECT ${DBController.responseColumn} FROM ${DBController.tableName} WHERE ${DBController.eventColumn} = ?`,
        [eventId]
      );

      // Get the first result (there should only be one result or none in the database
      // since all events are unique)
      prep.get(((err: Error | null, response: StoredResponseEvent | undefined) => {
        // If an error occurred then reject
        if (err)
          reject(err);
        // Otherwise resolve with something or nothing at all
        else
          resolve(response ? response.responseID : undefined);
      }));
    });
  }

  /**
   * This gets the database controller ready
   * @returns {Promise<void>}
   */
  public async start(): Promise<void> {
    // Check if the sqlite3 database is ready
    const isReady = await this.checkDB();

    // If it isn't ready
    if (!isReady)
      // Then set it up
      await this.setupDB();

    // Set isReady to true to allow other methods to know the database is ready.
    this.isReady = true;
  }

  /**
   * This method checks whether or not the database is ready to be used.
   * @returns {Promise<boolean>}
   */
  private checkDB(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // This prepares to check the sqlite_master table to make sure that the events table exists
      const prep = this.db.prepare(
        'SELECT * FROM sqlite_master WHERE name = ?',
        [DBController.tableName]
      );

      // Get the first result
      prep.get(((err, row: any[]) => {
        // If there was an error then reject
        if (err)
          reject(err);
        // If there was a result then the table exists
        if (row)
          resolve(true);
        // If there was not a result it doesn't exist.
        else
          resolve(false);
      }));
    });
  }

  /**
   * Currently all this does is create a table for the events to go in.
   * @returns {Promise<void>}
   */
  private setupDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Prepare to create the events table.
      // The first column is the eventID column which represents the event that is responded too
      // and the response column is the ID of the response event.
      const prep = this.db.prepare(`CREATE TABLE ${DBController.tableName} (
        ${DBController.eventColumn} TEXT PRIMARY KEY,
        ${DBController.responseColumn} TEXT)`
      );

      // Run the setup
      prep.run((err) => err ? reject(err) : resolve());
    });
  }
}
