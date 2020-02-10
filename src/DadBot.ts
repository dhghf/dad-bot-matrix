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
  MessageEventContent,
  SimpleFsStorageProvider,
  TextualMessageEventContent
} from "matrix-bot-sdk";

/**
 * This class handles the DadBot functions. Everything begins at the run method
 */
export class DadBot {
  private readonly client: MatrixClient;

  constructor(homeserver: string, token: string) {
    let storage = new SimpleFsStorageProvider(`${__dirname}/syncs.json`);
    this.client = new MatrixClient(homeserver, token, storage);
    AutojoinRoomsMixin.setupOnClient(this.client);
  }

  /**
   * Makes sure the message is valid before responding "Hi name, I'm dad"
   * Rules:
   *  - No edit messages
   *  - Messages only should be text
   *  - No self-responding messages.
   *  - Message must include "im" or "i'm" (NOT case-sensitive)
   * @param {string} userId The bot's user ID.
   * @param {MessageEvent} event The event to review
   * @returns {boolean}
   */
  private static isValidMessage(userId: string, event: MessageEvent<any>): boolean {
    // Validation to return
    let isValid = true;
    let split: string[];

    if (event.content.body) {
      // Split up the context this will be easier to search the word "im" or "i'm" for without
      // having to deal with whitespace issues.
      split = event.content.body.toLowerCase().split(' ');

      // Make sure it's only a text message and not the bot itself as well.
      if (event.content.msgtype !== 'm.text' || userId === event.sender)
        isValid = false;
      // No edits allowed.
      if (event.content['m.new_content'] !== undefined)
        isValid = false;
      // Body must include "im" or "i'm"
      if (!(split.includes('im') || split.includes('i\'m')))
        isValid = false;
    } else
      isValid = false;

    return isValid;
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
    let j: number | undefined;

    // Iterate through the split up context
    for (let element of split) {
      // Bring the element to lower case
      let toLower = element.toLowerCase();
      // Look for "im" or "i'm"
      if (toLower === 'im' || toLower === 'i\'m') {
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
   * Responds to the message
   * @param {string} roomId To send the message to
   * @param {MessageEvent<TextualMessageEventContent>} event Event to review before responding
   * @returns {Promise<void>}
   */
  private async respond(roomId: string, event: MessageEvent<MessageEventContent>): Promise<void> {
    // Get the name
    let name = DadBot.getName(event.content.body);
    // Build the response
    let response = `Hi ${name}, I'm Dad.`;

    // If the name was successfully gotten
    if (name.length > 0) {
      // Then send the response
      await this.client.sendText(roomId, response);
    }
  }
}