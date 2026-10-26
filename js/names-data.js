/*
 * Word lists used to find names and build code names. All local, no network.
 */
(function (global) {
  'use strict';

  const split = (s) => s.trim().split(/\s+/);

  // Common US K-12 first names across many backgrounds. Used only as a "seed" to spot
  // names in ordinary sentences — a pasted class list is always more accurate.
  const FIRST_NAMES = split(`
    Aaliyah Aaron Abby Abdul Abdullah Abel Abigail Abraham Abril Ada Adam Adan Addison Adeline Adrian Adriana Adrianna
    Agustin Ahmad Ahmed Aidan Aiden Aileen Aisha Aiyana Akira Alaina Alan Alana Alani Alayna Albert Alberto Alec
    Alejandra Alejandro Alessandra Alex Alexa Alexander Alexandra Alexandria Alexia Alexis Alfred Alfredo Ali Alia Alice
    Alicia Alina Alisha Alison Alissa Allison Alma Alondra Alyssa Amanda Amani Amara Amari Amaya Amber Amelia Amir Amira
    Amy Ana Anaya Anderson Andre Andrea Andres Andrew Andy Angel Angela Angelica Angelina Angelo Angie Anika Anita Ann
    Anna Annabelle Anne Annie Anthony Antoine Antonio Anya Aphrodite Arabella Archer Archie Aria Ariana Arianna Ariel
    Arjun Arlo Armando Arnav Arthur Arturo Aryan Asher Ashley Ashton Asia Athena Atticus Aubree Aubrey Audrey August
    Aurora Austin Autumn Ava Avery Axel Aya Ayaan Ayden Ayla Aylin Ayesha Barbara Baylee Beatrice Beau Bella Ben Benjamin
    Bennett Bentley Bernard Beth Bethany Betty Bianca Billy Blake Blakely Bobby Bodhi Brady Braxton Brayden Braylon Brenda
    Brendan Brenna Brennan Brent Brett Brian Briana Brianna Bridget Brielle Brody Brooke Brooklyn Brooklynn Bruce Bruno
    Bryan Bryce Bryson Byron Caden Caiden Caleb Callie Calvin Camden Cameron Camila Camille Camilo Candace Cara Carina
    Carl Carla Carlos Carly Carmen Carolina Caroline Carson Carter Casey Cassandra Cassidy Catalina Catherine Cayden Cecilia
    Cedric Celeste Cesar Chance Chandler Charlie Charles Charlotte Chase Chelsea Cheyenne Chloe Chris Christian Christina
    Christopher Ciara Cindy Claire Clara Clarissa Claudia Clayton Clementine Cody Colby Cole Colin Colton Connor Conor
    Cooper Cora Corbin Corey Cristian Cristina Cruz Crystal Cynthia Daisy Dakota Dallas Dalton Damian Damien Damon Dana
    Daniel Daniela Daniella Danielle Danny Dante Daphne Darius Darnell David Dawson Dean Deandre Deborah Declan Deja
    Delaney Delilah Demetrius Denise Dennis Derek Derrick Desmond Destiny Devin Devon Dexter Diana Diego Dillon Dimitri
    Dominic Dominick Donovan Dorothy Douglas Drake Dylan Easton Eden Edgar Eduardo Edward Edwin Eileen Elaine Eleanor
    Elena Eli Elias Elijah Elisa Elise Eliza Elizabeth Ella Elle Ellie Elliot Elliott Eloise Elsa Elena Emanuel Ember
    Emerson Emery Emilia Emiliano Emilio Emily Emma Emmanuel Emmett Emmy Enrique Enzo Eric Erica Erick Erik Erin Esme
    Esmeralda Esperanza Esteban Esther Ethan Eva Evan Evangeline Evelyn Everett Ezekiel Ezra Fabian Farah Fatima Felix
    Fernanda Fernando Finley Finn Fiona Francesca Francisco Frankie Franklin Freddy Gabriel Gabriela Gabriella Gabrielle
    Gael Gage Garrett Gavin Gemma Genesis Genevieve George Georgia Gerardo Gia Giana Gianna Gideon Gilberto Gina Giovanni
    Giselle Gracie Graham Grant Grayson Gregory Greta Griffin Guadalupe Guillermo Gustavo Hadley Hailey Haley Hamza Hana
    Hank Hannah Harley Harlow Harmony Harper Harrison Harry Harvey Hassan Hayden Hazel Heaven Hector Heidi Helen Henry
    Hiroshi Holden Hudson Hugo Hussein Ian Ibrahim Iker Imani Inaya Ingrid Irene Isaac Isabel Isabela Isabella Isabelle
    Isaiah Isaias Isla Ismael Israel Itzel Ivan Izabella Jace Jack Jackson Jacob Jacqueline Jada Jaden Jaime Jake Jakob
    Jalen Jamal Jamar James Jamie Jamir Jamison Jana Jane Janelle Janet Jared Jasmin Jasmine Jason Jasper Javier Javon
    Jaxon Jaxson Jayce Jayden Jaylen Jaylin Jayla Jazmin Jean Jeffrey Jenna Jennifer Jeremiah Jeremy Jesse Jessica Jesus
    Jett Jillian Jimena Jimmy Joanna Joaquin Jocelyn Joel Johan John Johnny Jonah Jonathan Jordan Jordyn Jorge Jose
    Joseph Josephine Joshua Josiah Josie Josue Journey Jovan Juan Judah Jude Julia Julian Juliana Julianna Julie Juliet
    Julio Julius Justin Kai Kaia Kailey Kaitlyn Kaleb Kali Kamari Kamila Kara Kareem Karen Karim Karina Karla Karson
    Kasey Kate Katelyn Katherine Kathryn Katie Kayden Kaylee Kayla Keegan Keira Keith Kellan Kelly Kelsey Kendall
    Kendra Kendrick Kennedy Kenneth Kenji Kenzie Keon Kevin Khalil Khloe Kiara Kieran Kimberly Kimora King Kinsley
    Kira Knox Kobe Kofi Kora Kristen Kristian Kyla Kyle Kylie Kyrie Laila Lainey Lana Landon Laura Lauren Layla Leah
    Leila Leilani Leland Leo Leon Leonardo Leslie Levi Lexi Liam Lila Liliana Lillian Lilly Lily Lincoln Linda Lindsey
    Lisa Logan Lola London Londyn Lorenzo Louis Luca Lucas Lucia Luciana Lucy Luis Luka Lukas Luke Luna Lydia Lyla
    Mackenzie Macy Maddox Madeline Madelyn Madison Mae Maeve Magnus Maia Makayla Malachi Malakai Malcolm Malia Maliyah
    Manuel Marco Marcos Marcus Margaret Maria Mariah Mariam Mariana Marisol Marissa Marley Marshall Martin Martina
    Marvin Mary Mateo Mathias Matias Matthew Mauricio Maverick Maya Mckenzie Megan Mehmet Mei Melanie Melissa Melody
    Mercy Meredith Mia Micah Michael Michaela Michelle Miguel Mila Milan Miles Miley Miller Milo Mina Miranda Miriam
    Mohamed Mohammad Mohammed Moises Molly Monica Monique Morgan Moses Muhammad Mustafa Myles Nadia Naomi Natalia
    Natalie Nathan Nathaniel Nayeli Neha Nehemiah Nevaeh Nia Nicholas Nicole Nikolai Nina Noah Noelle Nolan Nora Norah
    Nyla Octavia Oliver Olivia Omar Orion Oscar Owen Pablo Paige Paisley Paola Paris Parker Patricia Patrick Paul Paula
    Payton Penelope Peter Peyton Phillip Phoebe Piper Precious Presley Preston Priscilla Priya Quentin Quincy Quinn
    Rachel Raelynn Rafael Raheem Rahul Ramon Randy Raphael Raquel Rashad Raul Raven Reagan Rebecca Reese Reggie
    Reginald Reid Remi Remington Renata Rhett Ricardo Richard Ricky Riley Rishi Rocco Rodrigo Roman Romeo Ronald Ronan
    Rory Rosa Rosalie Rowan Ruben Ryan Ryder Rylan Rylee Sabrina Sadie Sage Saif Salma Salvador Sam Samantha Samara
    Samir Samson Samuel Santiago Santino Sara Sarah Sasha Savannah Sawyer Scarlett Sean Sebastian Selena Serena Sergio
    Seth Shane Shawn Shayla Sheldon Shelby Sienna Sierra Silas Simon Simone Skylar Sloane Sofia Sophia Sophie Spencer
    Stella Stephanie Stephen Steven Sydney Sylvia Talia Tamara Tanner Tatiana Taylor Teagan Terrance Terrell Tessa
    Thea Theo Theodore Thiago Thomas Tiana Tiffany Timothy Tobias Tommy Tony Trent Trevor Trinity Tristan Troy Tyler
    Tyrone Tyson Uriel Valentina Valeria Valerie Vanessa Vera Veronica Victor Victoria Vincent Violet Vivian Wade
    Walker Wesley Weston Whitney William Willow Wyatt Xander Xavier Ximena Yahir Yara Yasmin Yousef Yusuf Zachary
    Zahra Zain Zander Zane Zara Zariah Zayden Zayn Zion Zoe Zoey
    Will May June April Grace Hope Joy Faith Mark Bill Rose Summer Dawn Ray Sky River Ivy Daisy Iris Jade Ruby Pearl
    Olive Hunter Mason Cash Jack Frank Sunny Angel Star Drew Gene Ginger Holly Heather Robin Wren Brooks Glen Dale
    Pat Sue Don Max Kit Nova Royal Rich Tucker Harper Lane Reed Ridge Stone Sterling Ever Legend Ace Cole
  `);

  // First names that are also everyday English words. We match these more carefully
  // (only when capitalized, and not at the start of a sentence unless a last name follows).
  const COMMON_WORD_NAMES = new Set(split(`
    will may june april august grace hope joy faith mark bill rose summer autumn dawn art ray sky river ivy lily daisy
    iris violet jasmine hazel olive ruby pearl amber crystal destiny harmony honor justice king major chase hunter mason
    cash rich guy jack frank sunny storm rain angel star patience prince page paige drew gene sage jade ginger holly
    heather robin wren charity brook brooks glen dale cliff pat sue don rod sandy rusty buddy bob ace berry cole lane
    reed ridge stone sterling ever nova journey legend royal true blue kit max tucker heaven precious mercy miller
    parker carter walker baker cooper archer taylor paris london dallas austin chandler sydney madison jordan georgia
    marshall trinity genesis
  `));

  // Words that are never names (used when guessing last names, and to filter noise).
  const NOT_NAMES = new Set(split(`
    a an the and or but nor so yet for of in on at by to from with without into onto about above below after before
    during since until than then this that these those there here when where why how what which who whom whose is are
    was were be been being am do does did done has have had having can could should would will shall may might must
    not no yes i me my mine we us our ours you your yours he him his she her hers it its they them their theirs
    mr mrs ms miss mx dr prof sir madam
    monday tuesday wednesday thursday friday saturday sunday january february march april may june july august
    september october november december jan feb mar apr jun jul aug sep sept oct nov dec spring summer fall autumn winter
    math maths mathematics english ela science history reading writing spelling grammar art music pe gym health
    biology chemistry physics geometry algebra calculus statistics spanish french german latin chinese japanese
    social studies economics government civics geography technology coding computer computers stem steam band choir
    orchestra theater theatre drama library lunch recess homeroom advisory
    grade grades class classes period unit chapter lesson quiz test exam final midterm homework assignment project
    essay report rubric score scores points total average mean median goal goals iep plan meeting notes note
    student students teacher teachers parent parents guardian guardians principal counselor school district room
    team group table row column page section part question questions answer answers
    good great excellent strong weak needs improvement progress shows showed made makes working works worked
    very really also just only even still always never often sometimes usually today tomorrow yesterday week weeks
    day days month months year years morning afternoon evening night
    north south east west street st road rd avenue ave lane ln drive dr court ct boulevard blvd
    american african asian european hispanic latino latina native indian
    god jesus christ christmas easter thanksgiving halloween hanukkah ramadan
    all any each every some many most more less few both either neither other another such same own
    first last next previous new old high middle elementary junior senior freshman sophomore
    okay ok please thanks thank dear hello hi hey regards sincerely best yours
    attendance absent present tardy late early behavior participation effort
  `));

  // Honorifics that usually precede an adult's last name.
  const HONORIFICS = ['Mr', 'Mrs', 'Ms', 'Miss', 'Mx', 'Dr', 'Coach', 'Prof'];

  // Whimsical words picked because they almost never appear in real schoolwork.
  // That makes "putting names back" accurate later. None of them are real first names.
  const ADJECTIVES = split(`
    Fluffy Sparkly Zesty Giggly Bouncy Snazzy Glittery Wiggly Cosmic Jazzy Breezy Toasty Fuzzy Twinkly Bubbly
    Peppy Dizzy Snuggly Zippy Spunky Frosty Minty Velvety Puffy Squishy Wobbly Jolly Cheery Dazzling Plucky Perky
    Sprightly Chirpy Doodly Fizzy Glimmery Hoppy Jiggly Kooky Loopy Merry Nifty Quirky Rosy Shimmery Silly Snappy
    Sparkling Spiffy Swirly Tickly Tippy Tootly Twirly Wacky Whirly Whimsy Wiggy Zany Zippity Blissful Bubbling
    Chipper Cozy Crinkly Curly Dapper Dreamy Fancy Feathery Flappy Flippy Floaty Fluttery Frisky Gleeful Glowing
    Glowy Groovy Gusty Happy Hearty Humming Jaunty Jingly Jumpy Lucky Marshmallowy Mellow Misty Moony Noodly Peachy
    Pebbly Pillowy Plushy Polka Popping Pudgy Purring Rainbow Rumbly Rustling Shiny Sleepy Smiley Sniffly Snoozy
    Snowy Spotty Springy Sprinkly Starry Stripy Sugary Swooshy Tangy Tingly Toffee Tumbly Turbo Twinkling Velvet
    Waddly Whiskery Wispy Woolly Yummy Zappy Zigzag Zoomy Bumbly Buttery Clumsy Crispy Dotty Drowsy Fizzing Flashy
    Floppy Frothy Gloopy Hiccupy Honeyed Itsy Jellied Kindly Lemony Mossy Nutty Paddly Pickled Quacky Rascally
    Sassy Scruffy Slurpy Smudgy Spicy Squeaky Stompy Tinkly Twiddly Wiggly Zooming Blinky Boppy Chunky Dandy
  `);

  // Creatures, also chosen to avoid real surnames (no Fox, Wolf, Crane, Swan, Bird...).
  const CREATURES = split(`
    Unicorn Narwhal Platypus Axolotl Wombat Quokka Capybara Pangolin Llama Alpaca Penguin Otter Koala Panda Hedgehog
    Walrus Flamingo Toucan Puffin Dragon Kiwi Lemur Meerkat Ocelot Okapi Manatee Dolphin Seahorse Starfish Octopus
    Jellyfish Chinchilla Hamster Gerbil Ferret Raccoon Squirrel Chipmunk Beaver Moose Bison Yak Giraffe Zebra Hippo
    Rhino Cheetah Jaguar Leopard Panther Tiger Lion Lynx Bobcat Cougar Gazelle Antelope Kangaroo Wallaby Sloth
    Armadillo Anteater Tapir Iguana Gecko Chameleon Tortoise Turtle Frog Toad Newt Salamander Butterfly Dragonfly
    Ladybug Firefly Bumblebee Cricket Grasshopper Beetle Hummingbird Pelican Peacock Parrot Macaw Cockatoo Owl
    Ostrich Emu Dodo Yeti Griffon Pegasus Kraken Sphinx Gnome Pixie Sprite Goblin Troll Mermaid Hippogriff
    Basilisk Chimera Cyclops Centaur Minotaur Dinosaur Raptor Mammoth Trilobite Tardigrade Nautilus Jackalope
    Muffin Waffle Pancake Cupcake Dumpling Pretzel Noodle Biscuit Cookie Taco Burrito Nacho Pickle Meatball Donut
  `);

  global.FNames = {
    FIRST_NAMES: new Set(FIRST_NAMES.map((n) => n.toLowerCase())),
    COMMON_WORD_NAMES,
    NOT_NAMES,
    HONORIFICS,
    // Drop adjectives that show up in ordinary student writing often enough to confuse "put names back".
    ADJECTIVES: [...new Set(ADJECTIVES)].filter((w) => !new Set(split(`
      Happy Lucky Kindly Glowing Shiny Sleepy Silly Spicy Fancy Hearty Clumsy Crispy Rainbow Sparkling Velvet Polka
      Popping Humming Rustling Purring Bubbling Zooming Twinkling Fizzing Merry Cozy Dreamy Misty Snowy Sugary Yummy
    `)).has(w)),
    CREATURES: [...new Set(CREATURES)],
  };
})(typeof window !== 'undefined' ? window : globalThis);
