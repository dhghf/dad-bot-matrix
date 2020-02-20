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
import { DadBot } from "./DadBot";
import * as yaml from 'yaml';
import * as fs from 'fs';

type Config = {
  token: string;
  homeserver: string;
}

function getConfig(): Config {
  const configFile = fs.readFileSync(`${__dirname}/../../config.yaml`);
  let toString = configFile.toString();
  return yaml.parse(toString);
}

function main(): void {
  const config = getConfig();
  const dadBot = new DadBot(config.homeserver, config.token);
  dadBot.run()
    .then((id: string) => console.log(`Running as ${id}`))
    .catch((err: Error) => console.log(`An error occurred. ${err.message}`));
}

main();
