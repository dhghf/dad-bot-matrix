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
import {
  AutojoinRoomsMixin,
  MatrixClient,
  MessageEvent,
  RoomEvent,
  SimpleFsStorageProvider,
} from "matrix-bot-sdk";
import { DBController } from "./DBController";

type ResponseEvent = {
  type: string;
  content: object;
  ready: boolean;
}

/**
 * This class handles the DadBot functions. Everything begins at the run method
 */
export class DadBot {
  private readonly client: MatrixClient;
  private static readonly dbName = `${__dirname}/events.db`;
  private readonly db: DBController;
  private static readonly triggerWords = ['im', 'i\'m', 'imma', 'i’m'];

  constructor(homeserver: string, token: string) {
    // This will allow DadBot to refer to the last sync token rather than syncing from the
    // beginning of time (a little bit of an exaggeration)
    let storage = new SimpleFsStorageProvider(`${__dirname}/syncs.json`);
    // Matrix client for sending and receiving messages
    this.client = new MatrixClient(homeserver, token, storage);
    // This database allows us to store events that have been responded to. So that if a user
    // changes their original message DadBot will change their original response.
    this.db = new DBController(DadBot.dbName);
    // Auto-join rooms is a must!
    AutojoinRoomsMixin.setupOnClient(this.client);
  }

  /**
   * Makes sure the message is valid before responding "Hi name, I'm dad"
   * Rules:
   *  - Messages only should be text
   *  - No self-responding messages.
   *  - Body must include at least one trigger word (NOT case-sensitive)
   *  - Dad bot should only respond to relevant messages
   * @param {string} userId The bot's user ID.
   * @param {MessageEvent} event The event to review
   * @returns {boolean}
   */
  private static isValidMessage(userId: string, event: RoomEvent<any>): boolean {
    // Validation to return
    let isValid = true;
    let split: string[];

    // If there is a body / message..
    if (event.content.body) {
      // Split up the context this will be easier to search the word "im" or "i'm" for without
      // having to deal with whitespace issues.
      split = event.content.body.toLowerCase().split(' ');

      // Make sure it's only a text message and not the bot itself as well.
      if (event.content.msgtype !== 'm.text' || userId === event.sender)
        isValid = false;
      // Body must include at least one trigger word (ie. i'm or im)
      if (!split.some((word: string) => DadBot.triggerWords.includes(word)))
        isValid = false;
      // The message must had been sent from the last minute to be responded to. This helps
      // responding to messages from a long time ago (ie losing the last sync token)
      // @ts-ignore
      if (!DadBot.isRelevant(event['origin_server_ts']))
        isValid = false;

    } else
      isValid = false;

    return isValid;
  }

  /**
   * This checks whether or not an event's timestamp is relevant (this helps prevent DadBot from
   * responding to really old messages)
   * @param {number} timestamp Milliseconds
   * @returns {boolean}
   */
  private static isRelevant(timestamp: number): boolean {
    // Get the date of right now
    let now = new Date();
    // Get the message's date. (this will help compare now and the messages date)
    let msgDate = new Date(Math.floor((timestamp / 1000) * 1000));
    // Whether or not this message is relevant
    let isRelevant = true;

    // Is it still from today?
    if (now.getDate() != msgDate.getDate())
      isRelevant = false;
    // Has it happened within the same hour today?
    else if (now.getHours() != msgDate.getHours())
      isRelevant = false;
    // Has it happened within the same minute today?
    else if (now.getMinutes() != msgDate.getMinutes())
      isRelevant = false;

    // Finally return whether or not it was relevant or not.
    return isRelevant;
  }

  /**
   * Start the bot (only public method)
   * @returns {Promise<string>}
   */
  public async run(): Promise<string> {
    // This will help us later prevent the bot from responding to itself
    let userId = await this.client.getUserId();

    // If the userId was got
    if (userId) {
      // Then start the MatrixClient object
      await this.client.start();
      // Start the database controller
      await this.db.start();

      // Begin the message listener
      this.client.on('room.message', async (roomId: string, event: MessageEvent<any>) => {
        // Make sure the event is something we need before responding
        if (DadBot.isValidMessage(userId, event))
          // If everything checks up then respond.
          this.respond(roomId, event);
      });
    }
    // UserID to interact with (mostly for logging purposes)
    return userId;
  }

  /**
   * Gets the name for the "Hi NAME" response.
   * @param {string} context
   * @returns {string}
   */
  private static getName(context: string): string {
    // Name to return (can be empty, this just means there was no name to get)
    let result = '';
    // Split the context between the spaces, this will be easier to iterate through
    let split: string[] = context.split(' ');
    let i: number | undefined;
    let j: number;

    // Iterate through the split up context
    for (let element of split) {
      // Bring the element to lower case
      let toLower = element.toLowerCase();
      // Look for "im" or "i'm"
      if (DadBot.triggerWords.includes(toLower)) {
        // i = im + 1 which usually represents the name to mimic
        i = split.indexOf(element) + 1;
        // Break out of the loop.
        break;
      }
    }

    // If the name was found and it's not undefined
    if (i && split[i]) {
      // Then this is the name.
      result = split[i];
      // Let's see if we can get anything after that (usually some people will have two words
      // like "I'm so mad" the "so mad" part can be used too!
      j = i + 1;
      if (split[j]) {
        // Concatenate that second word
        result += ' ' + split[j];
      }
    }

    // return the name (if it's empty then there is no name!)
    return result;
  }

  /**
   * Responds to the message
   * @param {string} roomId To send the message to
   * @param {MessageEvent} event Event to review before responding
   * @returns {Promise<void>}
   */
  private async respond(roomId: string, event: MessageEvent<any>): Promise<void> {
    // Build the response event
    let response = await this.buildResponse(event);

    // If the response was successfully built
    if (response.ready) {
      // Then send the response
      // @ts-ignore Is event_id broken?
      const eventID = event.event_id as string;
      const respondedID = await this.client.sendEvent(roomId, response.type, response.content);

      if (respondedID)
        await this.db.addEventID(eventID, respondedID);
    }
  }

  /**
   * This gets the response event ready. It can possibly not be ready by some error that occurs.
   * (this basically means something went wrong and DON'T use it)
   * @param {MessageEvent} event Event to work with
   * @return {Promise<ResponseEvent>}
   */
  private async buildResponse(event: MessageEvent<any>): Promise<ResponseEvent> {
    // Response event to send to the Matrix room
    let response: ResponseEvent = {
      type: 'm.room.message',
      ready: false,
      content: {
        msgtype: 'm.notice'
      }
    };
    // Get the name
    let name = DadBot.getName(event.content.body);
    // Build the response message
    let message = `Hi ${name}, I'm Dad.`;

    // If the name was successfully gotten
    if (name.length > 0) {
      // Handle edit events that occur
      if (event.content['m.new_content'])
        response = await this.handleEdit(response, message, event);
      // Otherwise handle it naturally with a plain-text body
      else {
        // Build the event content by adding the message to the body
        response.content = {
          ...response.content,
          body: message
        };
        // Declare the response as ready to send
        response.ready = true;
      }
    }

    return response;
  }

  /**
   * If a user were to edit their original message that Dad Bot responded to this method handles
   * that edit event and edits the response message
   * @param {ResponseEvent} response This is the object that gets sent to the Matrix room (in
   * this method it's used as a edit event)
   * @param {string} newName The "new" name of when the user edited the message, it could still
   * be the same.
   * @param {RoomEvent} event Event to refer to for building this response.
   */
  private async handleEdit(response: ResponseEvent, newName: string, event: RoomEvent<any>) {
    // @ts-ignore
    // This is the event ID that this event is editing
    const eventId = event.content['m.relates_to']['event_id'] as string;
    // Check the database if DadBot responded to this message that's being edited
    const responseID = await this.db.getEventID(eventId);

    // If DadBot has responded to this message before then let's edit the response!
    if (responseID) {
      response.content = {
        ...response.content,
        // This is the new message
        "m.new_content": {
          "msgtype": "m.notice",
          "body": newName
        },
        // This tells what message it's modifying
        "m.relates_to": {
          "rel_type": "m.replace",
          "event_id": responseID
        },
        // This is like a backup for clients that don't support edits
        // (they will see " * Hi NAME, I'm Dad")
        "body": ` * ${newName}`
      };
      // Declare this as ready to use
      response.ready = true;
    }

    return response;
  }
}
