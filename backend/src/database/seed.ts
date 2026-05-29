import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';
import { Question, QuestionSkill, QuestionType, QuestionLevel } from '../questions/question.entity';
import { User, UserPlan } from '../users/user.entity';

dotenv.config({ path: join(__dirname, '../../.env') });

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'fly_edu',
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  synchronize: false,
  logging: false,
});

const questions: Partial<Question>[] = [
  // ═══════════════════════════════════════════════════════════════
  // SPEAKING — READ ALOUD (RA)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'RA0001', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_READ_ALOUD,
    title: 'Climate Change',
    content: 'Climate change is one of the most pressing issues facing humanity today. Rising temperatures, melting ice caps, and extreme weather events are just some of the consequences of increased greenhouse gas emissions.',
    level: QuestionLevel.EASY, prepTime: 35, responseTime: 40, isTrending: true,
    tips: 'Read at a natural pace. Focus on clear pronunciation and smooth delivery.',
  },
  {
    code: 'RA0002', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_READ_ALOUD,
    title: 'The Internet Revolution',
    content: 'The internet has fundamentally transformed the way people communicate, access information, and conduct business. Within just a few decades, it has evolved from a military communication tool into a global network connecting billions of people.',
    level: QuestionLevel.EASY, prepTime: 35, responseTime: 40,
    tips: 'Stress important words. Maintain consistent rhythm.',
  },
  {
    code: 'RA0003', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_READ_ALOUD,
    title: 'Biodiversity',
    content: 'Biodiversity refers to the variety of life on Earth at all its levels, from genes to ecosystems. It encompasses the evolutionary, ecological, and cultural processes that sustain life. Protecting biodiversity is essential for maintaining healthy ecosystems.',
    level: QuestionLevel.MEDIUM, prepTime: 35, responseTime: 40, isRepeated: true,
    tips: 'Pause at commas and periods. Do not rush through difficult words.',
  },
  {
    code: 'RA0004', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_READ_ALOUD,
    title: 'Artificial Intelligence',
    content: 'Artificial intelligence is rapidly changing industries across the globe. Machine learning algorithms can now diagnose diseases, predict weather patterns, and even compose music. However, ethical questions about AI decision-making remain largely unresolved.',
    level: QuestionLevel.MEDIUM, prepTime: 35, responseTime: 40, isTrending: true,
  },
  {
    code: 'RA0005', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_READ_ALOUD,
    title: 'Urbanization',
    content: 'More than half of the world\'s population now lives in urban areas, a proportion that is expected to increase to two-thirds by 2050. This rapid urbanization presents both opportunities and challenges for sustainable development, infrastructure, and social cohesion.',
    level: QuestionLevel.MEDIUM, prepTime: 35, responseTime: 40,
  },
  {
    code: 'RA0006', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_READ_ALOUD,
    title: 'Quantum Computing',
    content: 'Quantum computing harnesses the principles of quantum mechanics to process information in fundamentally different ways than classical computers. By exploiting superposition and entanglement, quantum computers can solve certain computational problems exponentially faster.',
    level: QuestionLevel.HARD, prepTime: 35, responseTime: 40,
  },
  {
    code: 'RA0007', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_READ_ALOUD,
    title: 'Ocean Acidification',
    content: 'Ocean acidification occurs when carbon dioxide from the atmosphere dissolves in seawater, forming carbonic acid. This process lowers the pH of the ocean, threatening marine ecosystems, particularly coral reefs and shellfish that depend on calcium carbonate.',
    level: QuestionLevel.HARD, prepTime: 35, responseTime: 40, isRepeated: true,
  },
  {
    code: 'RA0008', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_READ_ALOUD,
    title: 'Renewable Energy',
    content: 'Renewable energy sources such as solar, wind, and hydropower offer a sustainable alternative to fossil fuels. As technology improves and costs decline, renewable energy is becoming increasingly competitive, driving a global transition toward cleaner power systems.',
    level: QuestionLevel.EASY, prepTime: 35, responseTime: 40, isTrending: true,
  },
  {
    code: 'RA0009', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_READ_ALOUD,
    title: 'The Human Brain',
    content: 'The human brain contains approximately 86 billion neurons, each connected to thousands of others through synapses. This extraordinary complexity enables humans to think, feel, remember, and create. Despite decades of research, much about the brain remains poorly understood.',
    level: QuestionLevel.MEDIUM, prepTime: 35, responseTime: 40,
  },
  {
    code: 'RA0010', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_READ_ALOUD,
    title: 'Global Trade',
    content: 'Global trade has expanded dramatically over the past century, driven by advances in transportation, communication, and trade liberalization. Today, goods, services, and capital flow across borders at unprecedented speed, creating both economic opportunities and geopolitical tensions.',
    level: QuestionLevel.MEDIUM, prepTime: 35, responseTime: 40, isRepeated: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // SPEAKING — REPEAT SENTENCE (RS)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'RS0001', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_REPEAT_SENTENCE,
    title: 'Repeat Sentence 1',
    content: 'The library will be closed for renovations next Monday.',
    level: QuestionLevel.EASY, prepTime: 0, responseTime: 15,
  },
  {
    code: 'RS0002', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_REPEAT_SENTENCE,
    title: 'Repeat Sentence 2',
    content: 'Students are required to submit their assignments before the deadline.',
    level: QuestionLevel.EASY, prepTime: 0, responseTime: 15,
  },
  {
    code: 'RS0003', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_REPEAT_SENTENCE,
    title: 'Repeat Sentence 3',
    content: 'The professor has published several influential papers on quantum mechanics.',
    level: QuestionLevel.MEDIUM, prepTime: 0, responseTime: 15, isTrending: true,
  },
  {
    code: 'RS0004', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_REPEAT_SENTENCE,
    title: 'Repeat Sentence 4',
    content: 'Participants in the study were asked to complete a series of cognitive tests.',
    level: QuestionLevel.MEDIUM, prepTime: 0, responseTime: 15,
  },
  {
    code: 'RS0005', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_REPEAT_SENTENCE,
    title: 'Repeat Sentence 5',
    content: 'The government introduced new policies to address the rising cost of living.',
    level: QuestionLevel.MEDIUM, prepTime: 0, responseTime: 15, isRepeated: true,
  },
  {
    code: 'RS0006', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_REPEAT_SENTENCE,
    title: 'Repeat Sentence 6',
    content: 'Archaeological evidence suggests that humans have inhabited this region for over ten thousand years.',
    level: QuestionLevel.HARD, prepTime: 0, responseTime: 15,
  },
  {
    code: 'RS0007', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_REPEAT_SENTENCE,
    title: 'Repeat Sentence 7',
    content: 'Please register for the orientation session at least two days in advance.',
    level: QuestionLevel.EASY, prepTime: 0, responseTime: 15,
  },
  {
    code: 'RS0008', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_REPEAT_SENTENCE,
    title: 'Repeat Sentence 8',
    content: 'The conference will bring together researchers from more than forty countries.',
    level: QuestionLevel.MEDIUM, prepTime: 0, responseTime: 15, isTrending: true,
  },
  {
    code: 'RS0009', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_REPEAT_SENTENCE,
    title: 'Repeat Sentence 9',
    content: 'Cognitive behavioral therapy has proven effective for treating anxiety disorders.',
    level: QuestionLevel.HARD, prepTime: 0, responseTime: 15,
  },
  {
    code: 'RS0010', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_REPEAT_SENTENCE,
    title: 'Repeat Sentence 10',
    content: 'The seminar on data privacy is scheduled for Thursday afternoon in room B204.',
    level: QuestionLevel.MEDIUM, prepTime: 0, responseTime: 15,
  },

  // ═══════════════════════════════════════════════════════════════
  // SPEAKING — DESCRIBE IMAGE (DI)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'DI0001', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_DESCRIBE_IMAGE,
    title: 'Bar Chart - Renewable Energy',
    content: 'A bar chart showing renewable energy production (in gigawatts) by source: Solar (580 GW), Wind (743 GW), Hydro (1,360 GW), Biomass (130 GW), Geothermal (14 GW) in 2022.',
    level: QuestionLevel.MEDIUM, prepTime: 25, responseTime: 40, isTrending: true,
    suggestedAnswer: 'This bar chart illustrates renewable energy production by source in 2022. Hydropower dominates with 1,360 GW, followed by wind at 743 GW and solar at 580 GW. Biomass and geothermal contribute significantly less. Overall, the data suggests that hydropower remains the leading renewable source globally.',
    tips: 'Describe the type of graph, main trend, highest/lowest values, and give a conclusion.',
  },
  {
    code: 'DI0002', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_DESCRIBE_IMAGE,
    title: 'Pie Chart - Water Usage',
    content: 'A pie chart showing global water usage by sector: Agriculture (70%), Industry (22%), Domestic (8%).',
    level: QuestionLevel.EASY, prepTime: 25, responseTime: 40,
    suggestedAnswer: 'This pie chart shows the distribution of global water usage across three sectors. Agriculture accounts for the largest proportion at 70%, while industry uses 22% and domestic consumption represents only 8%. This highlights the dominant role of agricultural activities in global water consumption.',
    tips: 'State the chart type, describe proportions, and draw a conclusion.',
  },
  {
    code: 'DI0003', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_DESCRIBE_IMAGE,
    title: 'Line Graph - CO2 Emissions',
    content: 'A line graph showing global CO2 emissions (billion tons) from 1960 to 2020: 1960: 9.4, 1980: 18.5, 2000: 25.0, 2010: 33.0, 2020: 34.8.',
    level: QuestionLevel.MEDIUM, prepTime: 25, responseTime: 40, isRepeated: true,
    suggestedAnswer: 'This line graph illustrates the steady rise in global CO2 emissions from 1960 to 2020. Emissions nearly quadrupled from 9.4 billion tons in 1960 to 34.8 billion tons in 2020. The most rapid increase occurred between 1980 and 2010, suggesting accelerating industrialization during that period.',
  },
  {
    code: 'DI0004', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_DESCRIBE_IMAGE,
    title: 'Process Diagram - Water Cycle',
    content: 'A diagram showing the water cycle: evaporation from oceans and lakes → condensation forming clouds → precipitation as rain/snow → surface runoff into rivers → infiltration into groundwater → back to ocean.',
    level: QuestionLevel.MEDIUM, prepTime: 25, responseTime: 40,
    suggestedAnswer: 'This diagram illustrates the natural water cycle. The process begins with evaporation from water bodies, which rises and condenses to form clouds. Precipitation then falls as rain or snow, with water flowing into rivers through surface runoff or seeping into groundwater through infiltration, eventually returning to the ocean.',
  },
  {
    code: 'DI0005', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_DESCRIBE_IMAGE,
    title: 'Table - University Rankings',
    content: 'A table showing top 5 universities by ranking: 1. MIT (USA), 2. Cambridge (UK), 3. Stanford (USA), 4. Oxford (UK), 5. Harvard (USA). Scores based on research output, student satisfaction, and employability.',
    level: QuestionLevel.HARD, prepTime: 25, responseTime: 40, isTrending: true,
    suggestedAnswer: 'This table presents the top five universities globally. MIT from the USA holds the top position, followed by Cambridge in the UK. American institutions dominate with three of the five spots. Rankings are determined by research output, student satisfaction, and graduate employability, reflecting a comprehensive evaluation of academic excellence.',
  },

  // ═══════════════════════════════════════════════════════════════
  // SPEAKING — ANSWER SHORT QUESTION (ASQ)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'ASQ0001', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_ANSWER_SHORT_QUESTION,
    title: 'Short Question 1',
    content: 'What do you call a person who studies the stars and planets?',
    correctAnswer: 'astronomer',
    level: QuestionLevel.EASY, prepTime: 3, responseTime: 10,
  },
  {
    code: 'ASQ0002', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_ANSWER_SHORT_QUESTION,
    title: 'Short Question 2',
    content: 'What is the chemical symbol for water?',
    correctAnswer: 'H2O',
    level: QuestionLevel.EASY, prepTime: 3, responseTime: 10,
  },
  {
    code: 'ASQ0003', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_ANSWER_SHORT_QUESTION,
    title: 'Short Question 3',
    content: 'What is the name of the process by which plants make their own food using sunlight?',
    correctAnswer: 'photosynthesis',
    level: QuestionLevel.EASY, prepTime: 3, responseTime: 10,
  },
  {
    code: 'ASQ0004', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_ANSWER_SHORT_QUESTION,
    title: 'Short Question 4',
    content: 'Which organ in the human body is responsible for pumping blood?',
    correctAnswer: 'heart',
    level: QuestionLevel.EASY, prepTime: 3, responseTime: 10,
  },
  {
    code: 'ASQ0005', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_ANSWER_SHORT_QUESTION,
    title: 'Short Question 5',
    content: 'What is the term for a government run by the people, for the people?',
    correctAnswer: 'democracy',
    level: QuestionLevel.EASY, prepTime: 3, responseTime: 10,
  },
  {
    code: 'ASQ0006', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_ANSWER_SHORT_QUESTION,
    title: 'Short Question 6',
    content: 'What is the largest planet in our solar system?',
    correctAnswer: 'Jupiter',
    level: QuestionLevel.EASY, prepTime: 3, responseTime: 10,
  },
  {
    code: 'ASQ0007', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_ANSWER_SHORT_QUESTION,
    title: 'Short Question 7',
    content: 'What do you call a triangle with all three sides of equal length?',
    correctAnswer: 'equilateral',
    level: QuestionLevel.MEDIUM, prepTime: 3, responseTime: 10,
  },
  {
    code: 'ASQ0008', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_ANSWER_SHORT_QUESTION,
    title: 'Short Question 8',
    content: 'What is the study of the structure of the human body called?',
    correctAnswer: 'anatomy',
    level: QuestionLevel.MEDIUM, prepTime: 3, responseTime: 10, isRepeated: true,
  },
  {
    code: 'ASQ0009', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_ANSWER_SHORT_QUESTION,
    title: 'Short Question 9',
    content: 'In economics, what term describes a situation where supply equals demand?',
    correctAnswer: 'equilibrium',
    level: QuestionLevel.MEDIUM, prepTime: 3, responseTime: 10,
  },
  {
    code: 'ASQ0010', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_ANSWER_SHORT_QUESTION,
    title: 'Short Question 10',
    content: 'What is the term for the layer of gases surrounding the Earth?',
    correctAnswer: 'atmosphere',
    level: QuestionLevel.EASY, prepTime: 3, responseTime: 10,
  },

  // ═══════════════════════════════════════════════════════════════
  // SPEAKING — RESPOND TO A SITUATION (RTS)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'RTS0001', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_RESPOND_TO_SITUATION,
    title: 'Late Delivery Complaint',
    content: `You ordered a laptop online two weeks ago and it still hasn't arrived. The estimated delivery was 5 days. You have been trying to track the order online but the tracking page shows "in transit" with no updates. Call the customer service of the online store and explain the situation. Ask them to investigate and tell you when to expect the delivery.`,
    suggestedAnswer: `Hi, I'm calling because I placed an order for a laptop about two weeks ago and it still hasn't arrived. The estimated delivery time was five days, but my tracking page has shown "in transit" for over a week with no updates. I'm quite concerned because I need the laptop for work. Could you please investigate what's happened with my order? My order number is available if needed. I'd really appreciate it if you could tell me when I can expect the delivery, or arrange for a replacement if the package has been lost. Thank you.`,
    level: QuestionLevel.MEDIUM, prepTime: 3, responseTime: 40,
  },
  {
    code: 'RTS0002', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_RESPOND_TO_SITUATION,
    title: 'Neighbour Noise Complaint',
    content: `You live in an apartment and your upstairs neighbour plays loud music late at night, making it impossible to sleep. This has been happening for the past two weeks, affecting your performance at work. You bump into your neighbour in the hallway. Tell them about the problem, explain how it is affecting you, and suggest a solution.`,
    suggestedAnswer: `Hi, I'm so glad I caught you. I actually wanted to talk to you about something that's been bothering me. I've been having trouble sleeping for the past couple of weeks because of the music coming from your apartment late at night. I understand you enjoy your music, but it's been quite loud, especially after midnight. It's really affecting my sleep, and I've been struggling to concentrate at work as a result. I was wondering if you might be able to keep the volume down after ten or eleven o'clock on weekdays? Or perhaps use headphones at night? I'd really appreciate it. I'm happy to talk about what works for both of us.`,
    level: QuestionLevel.MEDIUM, prepTime: 3, responseTime: 40,
  },
  {
    code: 'RTS0003', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_RESPOND_TO_SITUATION,
    title: 'Wrong Restaurant Order',
    content: `You are at a restaurant and the waiter has brought you the wrong dish. You ordered a vegetarian pasta but received a chicken dish. You are vegetarian for health reasons. Call the waiter's attention, explain the mistake politely, and ask them to bring the correct order. You are in a hurry because you have a meeting in 30 minutes.`,
    suggestedAnswer: `Excuse me, I'm sorry to bother you, but I think there may have been a mix-up with my order. I ordered the vegetarian pasta, but this dish has chicken in it. I'm actually vegetarian for health reasons, so I'm unable to eat this. Could you please check with the kitchen and bring me the correct dish? I do apologise for the inconvenience, but I'm also in a bit of a hurry — I have a meeting in about thirty minutes. If it's possible to prioritise my order, I would really appreciate it. Thank you so much for your help.`,
    level: QuestionLevel.EASY, prepTime: 3, responseTime: 40,
  },
  {
    code: 'RTS0004', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_RESPOND_TO_SITUATION,
    title: 'Gym Membership Cancellation',
    content: `You joined a gym six months ago on a 12-month contract. You have recently been diagnosed with a knee injury that prevents you from exercising for at least six months. You need to cancel or pause your gym membership. Call the gym's customer service line, explain your situation, and ask about their policy for medical cancellations or pauses.`,
    suggestedAnswer: `Hello, I'm calling because I need to discuss my gym membership. I joined about six months ago on a twelve-month contract, but unfortunately I've recently been diagnosed with a knee injury. My doctor has advised me to avoid any physical exercise for at least the next six months. Given this situation, I was hoping to either cancel my membership or put it on hold until I've recovered. I do have a medical certificate from my doctor if you need documentation. Could you please let me know what your policy is for medical situations like mine? I'd really appreciate your help in resolving this as soon as possible.`,
    level: QuestionLevel.MEDIUM, prepTime: 3, responseTime: 40,
  },
  {
    code: 'RTS0005', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_RESPOND_TO_SITUATION,
    title: 'Hotel Room Problem',
    content: `You have checked into a hotel room and discovered several problems: the air conditioning is not working, the bathroom has a leaking tap, and the WiFi password provided at check-in doesn't work. You paid for a premium room. Call the front desk, describe the problems, and ask for either the issues to be fixed promptly or to be moved to another room.`,
    suggestedAnswer: `Good evening, I'm calling from room 412. I checked in earlier today and I've encountered a few issues that I was hoping you could help me with. First, the air conditioning doesn't seem to be working at all — there's no cold air coming out. Second, the tap in the bathroom is leaking quite noticeably. And third, the WiFi password I was given at check-in isn't working on any of my devices. I paid for a premium room and I was expecting everything to be in order. Could you please send someone to fix these issues as soon as possible? Alternatively, if that's not possible tonight, I'd be happy to be moved to another room of the same category. I'd appreciate a quick response. Thank you.`,
    level: QuestionLevel.HARD, prepTime: 3, responseTime: 40,
  },

  // ═══════════════════════════════════════════════════════════════
  // SPEAKING — SUMMARISE SPOKEN TEXT / GROUP DISCUSSION (SGD)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'SGD0001', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_SUMMARISE_GROUP_DISCUSSION,
    title: 'Remote Work Policy',
    content: `[Moderator] Today we're discussing whether companies should allow employees to work remotely full-time. Alex, what do you think?
[Alex] I think remote work is great for productivity. People avoid commuting, have fewer office distractions, and can design their own environment. Studies show output actually increases.
[Maya] I disagree. Collaboration suffers when everyone's at home. Brainstorming sessions, mentoring junior staff, and building team culture — those things require being in the same room.
[Moderator] James, any thoughts?
[James] I'd say a hybrid model is the answer. Give employees two or three days at home, the rest in office. You get the best of both — flexibility and face-to-face connection.
[Alex] That sounds reasonable, but companies need to invest in the right tools and trust their people regardless of location.
[Maya] Agreed on trust, but I'd still push for more in-person time, especially for new hires who need onboarding support.`,
    level: QuestionLevel.MEDIUM, prepTime: 10, responseTime: 75,
  },
  {
    code: 'SGD0002', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_SUMMARISE_GROUP_DISCUSSION,
    title: 'Social Media in Schools',
    content: `[Moderator] Our topic is whether smartphones and social media should be banned in schools. Sophie, start us off.
[Sophie] I firmly believe they should be banned during class hours. Students are constantly distracted, checking notifications instead of listening to teachers. Academic performance drops.
[Liam] But banning phones is unrealistic. Students use them for research, educational apps, and staying in touch with parents for safety reasons. A blanket ban seems outdated.
[Moderator] Nina, what's your view?
[Nina] I think we need digital literacy, not bans. Teaching students when and how to use technology responsibly is a life skill. Banning doesn't prepare them for the real world.
[Sophie] That sounds ideal, but it requires teachers to be trained too, and most schools don't have those resources.
[Liam] Even so, some restriction is better than none. Maybe no phones during exams and core lessons, but flexible use during breaks and independent study.`,
    level: QuestionLevel.MEDIUM, prepTime: 10, responseTime: 75,
  },
  {
    code: 'SGD0003', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_SUMMARISE_GROUP_DISCUSSION,
    title: 'Universal Basic Income',
    content: `[Moderator] We're talking about universal basic income — should governments provide every citizen a regular unconditional payment? Carlos, what's your position?
[Carlos] I support it strongly. Automation is eliminating jobs at an alarming rate. A UBI would give displaced workers a safety net, reduce poverty, and actually stimulate local economies as people spend that money.
[Elena] The problem is cost. Where does the money come from? Significant tax increases would be needed, and that could discourage investment and slow economic growth.
[Moderator] Tom, your thoughts?
[Tom] I see merit in both sides. A targeted version — replacing inefficient welfare programmes with a streamlined basic income — could be more cost-effective than the current system.
[Carlos] That's a fair compromise. The key is simplicity and universality. Means-testing adds bureaucracy and stigma.
[Elena] I could accept a pilot programme to gather evidence. But rolling it out nationally without data would be irresponsible.`,
    level: QuestionLevel.HARD, prepTime: 10, responseTime: 75,
  },
  {
    code: 'SGD0004', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_SUMMARISE_GROUP_DISCUSSION,
    title: 'Fast Fashion and Sustainability',
    content: `[Moderator] Fast fashion is our topic today — is it a problem, and what should be done? Rachel, open the discussion.
[Rachel] Fast fashion is an environmental disaster. Clothing production accounts for ten percent of global carbon emissions and creates enormous textile waste. Consumers buy cheap clothes they discard within months.
[David] But fast fashion made clothing affordable for lower-income people. Before it, fashion was a luxury. We shouldn't restrict access to affordable clothing.
[Moderator] What do you think, Priya?
[Priya] The solution isn't restricting access — it's changing the business model. Brands should use sustainable materials, extend product lifespans, and introduce take-back programmes.
[Rachel] Legislation is also necessary. Carbon taxes on fashion imports and mandatory disclosure of supply chain emissions would force change at the corporate level.
[David] I agree that corporate responsibility is key, but consumer education is equally important. People need to understand the real cost of cheap clothing.`,
    level: QuestionLevel.MEDIUM, prepTime: 10, responseTime: 75,
  },
  {
    code: 'SGD0005', skill: QuestionSkill.SPEAKING, type: QuestionType.SPEAKING_SUMMARISE_GROUP_DISCUSSION,
    title: 'Artificial Intelligence in Healthcare',
    content: `[Moderator] Today we're exploring AI's role in healthcare. Should we trust AI to diagnose and treat patients? Marcus, start us off.
[Marcus] AI in healthcare is genuinely exciting. Machine learning models can analyse medical images with greater accuracy than radiologists, catch early-stage cancers, and process thousands of variables to predict patient outcomes. It saves lives.
[Sarah] I have concerns about accountability. If an AI misdiagnoses a patient, who is responsible — the developer, the hospital, or the doctor who approved the diagnosis? The legal and ethical frameworks aren't ready.
[Moderator] Jin, what's your perspective?
[Jin] AI should be a tool, not a replacement. Doctors bring empathy, contextual judgement, and ethical reasoning that algorithms can't replicate. Using AI for routine diagnostics while keeping human oversight for complex decisions is the right balance.
[Marcus] That's sensible. AI is best at pattern recognition. Decisions involving patient values and quality of life need a human touch.
[Sarah] Agreed, but we also need robust data privacy protections. Patient data fuelling these systems must be strictly governed.`,
    level: QuestionLevel.HARD, prepTime: 10, responseTime: 75,
  },

  // ═══════════════════════════════════════════════════════════════
  // WRITING — SUMMARIZE WRITTEN TEXT (SWT)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'SWT0001', skill: QuestionSkill.WRITING, type: QuestionType.WRITING_SUMMARIZE_WRITTEN_TEXT,
    title: 'The Effects of Social Media',
    content: `Social media platforms have transformed human communication in profound ways. Billions of people now use platforms like Facebook, Instagram, Twitter, and TikTok to share information, connect with friends, and consume news. While these platforms have democratized communication and given voice to marginalized groups, they have also been linked to rising rates of anxiety and depression, particularly among teenagers. Research suggests that excessive social media use correlates with lower self-esteem due to social comparison. Furthermore, the spread of misinformation through social media has become a serious challenge for democratic societies, as false information can reach millions of users within hours. Despite these concerns, social media remains a powerful tool for social movements, disaster relief coordination, and global awareness campaigns.`,
    level: QuestionLevel.MEDIUM, minWords: 5, maxWords: 75,
    suggestedAnswer: 'While social media has democratized communication and empowered social movements, its negative effects on mental health, particularly increased anxiety and depression among teenagers due to social comparison, combined with the rapid spread of misinformation, present significant challenges to individual wellbeing and democratic societies.',
    tips: 'Write ONE sentence of 5-75 words capturing the main idea and key supporting point.',
    isTrending: true,
  },
  {
    code: 'SWT0002', skill: QuestionSkill.WRITING, type: QuestionType.WRITING_SUMMARIZE_WRITTEN_TEXT,
    title: 'Water Scarcity',
    content: `Water scarcity affects more than 40% of the global population and is projected to worsen as climate change intensifies and demand rises. Agriculture accounts for approximately 70% of all freshwater withdrawals worldwide, making it the largest consumer of this finite resource. In many developing nations, women and girls spend hours each day collecting water, limiting their access to education and economic opportunities. Innovative solutions such as drip irrigation, water recycling, and desalination are being developed to address the crisis, but implementation remains slow due to high costs and infrastructure challenges. International cooperation and policy reform are considered essential to ensure equitable water access for future generations.`,
    level: QuestionLevel.MEDIUM, minWords: 5, maxWords: 75,
    suggestedAnswer: 'Water scarcity, affecting over 40% of the global population and worsened by agriculture\'s dominant use of freshwater resources, demands urgent international cooperation, policy reform, and innovative technological solutions to ensure equitable access, particularly for vulnerable populations in developing nations.',
    tips: 'Include the main problem and the proposed solutions in one sentence.',
    isRepeated: true,
  },
  {
    code: 'SWT0003', skill: QuestionSkill.WRITING, type: QuestionType.WRITING_SUMMARIZE_WRITTEN_TEXT,
    title: 'Automation and Employment',
    content: `The rise of automation and artificial intelligence is fundamentally reshaping the labor market. While automation increases productivity and reduces costs for businesses, it displaces workers in routine and manual occupations. Manufacturing, transportation, and data entry are among the most vulnerable sectors. Economists debate whether new jobs created by technological advancement will outpace those eliminated, as happened during previous industrial revolutions. Some argue that governments must invest in retraining programs and education to prepare workers for the jobs of the future, while others advocate for universal basic income as a safety net. Without proactive policy responses, automation risks widening economic inequality.`,
    level: QuestionLevel.HARD, minWords: 5, maxWords: 75,
    suggestedAnswer: 'Automation and artificial intelligence, while boosting productivity, are displacing workers in vulnerable sectors such as manufacturing and transportation, requiring proactive government responses including retraining programs and potential universal basic income to prevent widening economic inequality.',
  },
  {
    code: 'SWT0004', skill: QuestionSkill.WRITING, type: QuestionType.WRITING_SUMMARIZE_WRITTEN_TEXT,
    title: 'The Benefits of Bilingualism',
    content: `Research in cognitive science has demonstrated that speaking two or more languages provides significant cognitive benefits beyond communication. Bilingual individuals show enhanced executive function, including better attention control, task-switching ability, and working memory capacity. Studies suggest that lifelong bilingualism may delay the onset of Alzheimer\'s disease by several years, as maintaining two language systems keeps the brain cognitively active. Children raised in bilingual households demonstrate greater metalinguistic awareness and often perform better on tests requiring creative problem-solving. Despite these advantages, bilingual education remains controversial in some countries, with critics arguing that it may slow the development of proficiency in either language during early childhood.`,
    level: QuestionLevel.MEDIUM, minWords: 5, maxWords: 75,
    suggestedAnswer: 'Bilingualism provides significant cognitive benefits including enhanced executive function, improved attention and memory, and potential delay of Alzheimer\'s onset, making a compelling case for bilingual education despite ongoing controversy about its effects on early childhood language development.',
    isTrending: true,
  },
  {
    code: 'SWT0005', skill: QuestionSkill.WRITING, type: QuestionType.WRITING_SUMMARIZE_WRITTEN_TEXT,
    title: 'Microplastics Pollution',
    content: `Microplastics — tiny plastic particles less than five millimeters in size — have been detected in virtually every environment on Earth, from the deepest ocean trenches to Arctic ice and human bloodstreams. These particles originate from the breakdown of larger plastic items, synthetic clothing fibers, and industrial pellets. Marine ecosystems are particularly affected, with fish and shellfish ingesting microplastics that subsequently enter the human food chain. Research on the health effects of microplastic consumption is still emerging, but preliminary studies suggest potential links to inflammation, hormonal disruption, and cellular damage. Addressing microplastic pollution requires reducing plastic production at its source, improving waste management, and developing biodegradable alternatives.`,
    level: QuestionLevel.HARD, minWords: 5, maxWords: 75,
    suggestedAnswer: 'Microplastics, found everywhere from ocean depths to human blood and linked to potential health risks including inflammation and hormonal disruption, require urgent systemic solutions including reduced plastic production, improved waste management, and development of biodegradable materials.',
  },

  // ═══════════════════════════════════════════════════════════════
  // WRITING — ESSAY (WE)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'WE0001', skill: QuestionSkill.WRITING, type: QuestionType.WRITING_ESSAY,
    title: 'Online Education',
    content: 'Some people believe that online education is as effective as traditional classroom learning, while others disagree. Discuss both views and give your own opinion.',
    level: QuestionLevel.MEDIUM, minWords: 200, maxWords: 300,
    suggestedAnswer: 'The debate over online versus traditional education has intensified following rapid advances in educational technology. Proponents of online learning argue that it offers unparalleled flexibility, allowing students to study at their own pace and from any location. This accessibility has democratized education, enabling millions who previously lacked access to quality instruction to pursue qualifications. Additionally, online platforms often incorporate interactive tools and immediate feedback mechanisms that can enhance engagement.\n\nHowever, critics contend that traditional classrooms provide irreplaceable benefits. Face-to-face interaction fosters social skills, collaborative learning, and mentorship relationships that are difficult to replicate virtually. Furthermore, students without reliable internet access or suitable study environments are disadvantaged by online formats, potentially widening educational inequality.\n\nIn my view, a blended approach combining the flexibility of online learning with the social richness of classroom instruction represents the most effective educational model. Rather than viewing these formats as mutually exclusive, educational institutions should leverage the strengths of both to create adaptive learning environments tailored to diverse student needs.',
    tips: 'Structure: Introduction (2-3 sentences) → View 1 (1 paragraph) → View 2 (1 paragraph) → Your opinion (1 paragraph) → Conclusion.',
    isTrending: true,
  },
  {
    code: 'WE0002', skill: QuestionSkill.WRITING, type: QuestionType.WRITING_ESSAY,
    title: 'Technology and Human Connection',
    content: 'Technology has made the world more connected, but some argue it has made people less socially connected in real life. To what extent do you agree or disagree?',
    level: QuestionLevel.MEDIUM, minWords: 200, maxWords: 300,
    suggestedAnswer: 'The proliferation of smartphones and social media has undeniably brought people closer across geographical distances, yet there is growing concern that this digital connectivity may be undermining face-to-face relationships. I largely agree with this view, though with important qualifications.\n\nOn one hand, technology enables instant communication with friends, family, and colleagues worldwide. Video calls, messaging apps, and social platforms allow people to maintain relationships that geography would otherwise have made impossible. For immigrants, remote workers, and those with mobility limitations, technology is a genuine lifeline.\n\nNevertheless, evidence suggests that digital communication often substitutes rather than supplements in-person interaction. Studies show that heavy smartphone use during social gatherings reduces the quality of those interactions, even when devices remain unused. The curated nature of social media encourages performance over authenticity, fostering superficial rather than deep connections. Moreover, the dopamine-driven design of social platforms creates compulsive use patterns that displace time otherwise spent in physical community.\n\nIn conclusion, while technology expands our communicative reach, its tendency to fragment attention and replace embodied interaction means that mindful, intentional use is essential to preserve genuine human connection.',
    isRepeated: true,
  },
  {
    code: 'WE0003', skill: QuestionSkill.WRITING, type: QuestionType.WRITING_ESSAY,
    title: 'Environmental Responsibility',
    content: 'Some people think that individuals can do very little to help the environment, and it is governments and large companies that need to take responsibility. To what extent do you agree or disagree?',
    level: QuestionLevel.HARD, minWords: 200, maxWords: 300,
    suggestedAnswer: 'The question of where responsibility for environmental protection lies — with individuals or institutions — is crucial in addressing the climate crisis. While I agree that governments and corporations bear the greater burden, individual action also plays a meaningful role.\n\nGovernments and large companies are responsible for systemic change that individuals cannot achieve alone. Industrial emissions, deforestation, and fossil fuel dependence are driven primarily by corporate practices and policy frameworks. Without regulatory intervention, such as carbon taxes, emission caps, and investment in renewable infrastructure, individual efforts have negligible impact on aggregate environmental outcomes.\n\nHowever, dismissing individual responsibility entirely is problematic. Consumer choices collectively shape market demand; the rise of electric vehicles, plant-based diets, and sustainable fashion demonstrates that individual behavior can drive significant industry shifts over time. Furthermore, civic participation — voting, advocacy, and community organizing — enables individuals to influence the policies and corporate practices they cannot change through consumption alone.\n\nIn conclusion, while systemic change driven by government policy and corporate accountability is essential and must be prioritized, individual action amplifies this change and helps build the social mandate necessary for institutions to act decisively.',
    isTrending: true,
  },
  {
    code: 'WE0004', skill: QuestionSkill.WRITING, type: QuestionType.WRITING_ESSAY,
    title: 'Space Exploration',
    content: 'Some people think that space exploration is a waste of money and these resources should be used to solve problems on Earth. Others think space exploration is essential. Discuss both views.',
    level: QuestionLevel.MEDIUM, minWords: 200, maxWords: 300,
  },
  {
    code: 'WE0005', skill: QuestionSkill.WRITING, type: QuestionType.WRITING_ESSAY,
    title: 'Urbanization',
    content: 'As cities continue to grow rapidly, many people believe that governments should prioritize building new cities in rural areas rather than expanding existing urban centers. Do you agree or disagree?',
    level: QuestionLevel.HARD, minWords: 200, maxWords: 300,
  },

  // ═══════════════════════════════════════════════════════════════
  // READING — FIB Reading & Writing (RFIB)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'RFIB0001', skill: QuestionSkill.READING, type: QuestionType.READING_FIB_R_W,
    title: 'Climate Science',
    content: 'Scientists have long studied the Earth\'s __1__ to understand how human activities affect global temperatures. The __2__ of greenhouse gases such as carbon dioxide has increased dramatically since the Industrial Revolution, trapping heat in the atmosphere. This phenomenon, known as the __3__ effect, is the primary driver of modern climate change.',
    options: [
      { blank: '1', choices: ['atmosphere', 'geology', 'hydrology', 'lithosphere'] },
      { blank: '2', choices: ['concentration', 'reduction', 'absence', 'elimination'] },
      { blank: '3', choices: ['greenhouse', 'domino', 'butterfly', 'ripple'] },
    ],
    correctAnswer: { '1': 'atmosphere', '2': 'concentration', '3': 'greenhouse' },
    level: QuestionLevel.MEDIUM, isTrending: true,
  },
  {
    code: 'RFIB0002', skill: QuestionSkill.READING, type: QuestionType.READING_FIB_R_W,
    title: 'Psychology of Learning',
    content: 'Memory __1__ is a technique that involves reviewing material at increasing intervals to improve long-term retention. Research shows that __2__ practice — testing yourself on material rather than simply re-reading — significantly enhances recall. These strategies exploit the brain\'s natural tendency to __3__ frequently accessed information.',
    options: [
      { blank: '1', choices: ['consolidation', 'spaced repetition', 'rehearsal', 'encoding'] },
      { blank: '2', choices: ['retrieval', 'passive', 'visual', 'auditory'] },
      { blank: '3', choices: ['prioritize', 'discard', 'suppress', 'ignore'] },
    ],
    correctAnswer: { '1': 'spaced repetition', '2': 'retrieval', '3': 'prioritize' },
    level: QuestionLevel.HARD,
  },
  {
    code: 'RFIB0003', skill: QuestionSkill.READING, type: QuestionType.READING_FIB_R_W,
    title: 'Economics Basics',
    content: 'In a free market economy, prices are determined by the forces of __1__ and demand. When supply exceeds demand, prices tend to __2__, incentivizing producers to reduce output. Conversely, when demand outstrips supply, prices rise, encouraging greater __3__.',
    options: [
      { blank: '1', choices: ['supply', 'control', 'regulation', 'distribution'] },
      { blank: '2', choices: ['fall', 'rise', 'stabilize', 'fluctuate'] },
      { blank: '3', choices: ['production', 'consumption', 'taxation', 'inflation'] },
    ],
    correctAnswer: { '1': 'supply', '2': 'fall', '3': 'production' },
    level: QuestionLevel.EASY,
  },
  {
    code: 'RFIB0004', skill: QuestionSkill.READING, type: QuestionType.READING_FIB_R_W,
    title: 'Evolutionary Biology',
    content: 'Charles Darwin\'s theory of __1__ selection proposed that organisms best adapted to their environment are more likely to survive and reproduce. Over generations, favorable __2__ become more common within a population, leading to __3__ — the gradual development of new species.',
    options: [
      { blank: '1', choices: ['natural', 'artificial', 'sexual', 'genetic'] },
      { blank: '2', choices: ['traits', 'behaviors', 'environments', 'mutations only'] },
      { blank: '3', choices: ['speciation', 'extinction', 'migration', 'adaptation only'] },
    ],
    correctAnswer: { '1': 'natural', '2': 'traits', '3': 'speciation' },
    level: QuestionLevel.MEDIUM, isRepeated: true,
  },
  {
    code: 'RFIB0005', skill: QuestionSkill.READING, type: QuestionType.READING_FIB_R_W,
    title: 'Urbanization Trends',
    content: 'The global shift toward urban living has been one of the most __1__ demographic changes of the twentieth century. Cities offer economic opportunities and access to services, attracting rural migrants in a process called __2__. However, rapid urban growth often __3__ the capacity of infrastructure and public services.',
    options: [
      { blank: '1', choices: ['significant', 'modest', 'negligible', 'controversial'] },
      { blank: '2', choices: ['rural-urban migration', 'gentrification', 'suburbanization', 'counter-urbanization'] },
      { blank: '3', choices: ['exceeds', 'reduces', 'improves', 'stabilizes'] },
    ],
    correctAnswer: { '1': 'significant', '2': 'rural-urban migration', '3': 'exceeds' },
    level: QuestionLevel.MEDIUM,
  },

  // ═══════════════════════════════════════════════════════════════
  // READING — MCQ Multiple Answer (RMCQM)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'RMCQM0001', skill: QuestionSkill.READING, type: QuestionType.READING_MCQ_MULTIPLE_ANSWER,
    title: 'Benefits of Exercise',
    content: 'Regular physical exercise is one of the most powerful interventions for both physical and mental health. Studies consistently show that exercise reduces the risk of cardiovascular disease, type 2 diabetes, and certain cancers. Beyond physical benefits, exercise releases endorphins — neurochemicals that improve mood and reduce symptoms of depression and anxiety. Research also indicates that regular physical activity improves cognitive function, including memory, concentration, and executive function. Despite these well-documented benefits, global rates of physical inactivity continue to rise, driven by sedentary work environments, urbanization, and increased screen time.',
    options: [
      { label: 'A', text: 'Exercise reduces the risk of cardiovascular disease.' },
      { label: 'B', text: 'Exercise is the only treatment for depression.' },
      { label: 'C', text: 'Exercise improves cognitive function including memory.' },
      { label: 'D', text: 'Global physical inactivity rates are declining.' },
      { label: 'E', text: 'Exercise releases endorphins that improve mood.' },
    ],
    correctAnswer: ['A', 'C', 'E'],
    level: QuestionLevel.MEDIUM, isTrending: true,
  },
  {
    code: 'RMCQM0002', skill: QuestionSkill.READING, type: QuestionType.READING_MCQ_MULTIPLE_ANSWER,
    title: 'Renewable Energy Challenges',
    content: 'While renewable energy sources offer significant environmental advantages, their widespread adoption faces several challenges. Solar and wind energy are intermittent, meaning they only generate power when the sun shines or the wind blows, creating reliability issues for power grids. Energy storage technology, particularly battery storage, remains expensive and limited in capacity. Additionally, transitioning from fossil fuels requires massive investment in new infrastructure, including transmission lines and smart grids. In some regions, renewable energy projects face public opposition due to concerns about landscape impact and wildlife disruption.',
    options: [
      { label: 'A', text: 'Renewable energy is completely reliable and consistent.' },
      { label: 'B', text: 'Solar and wind energy are intermittent sources.' },
      { label: 'C', text: 'Battery storage technology is currently expensive.' },
      { label: 'D', text: 'Some communities oppose renewable energy projects.' },
      { label: 'E', text: 'Fossil fuels have no infrastructure requirements.' },
    ],
    correctAnswer: ['B', 'C', 'D'],
    level: QuestionLevel.MEDIUM,
  },
  {
    code: 'RMCQM0003', skill: QuestionSkill.READING, type: QuestionType.READING_MCQ_MULTIPLE_ANSWER,
    title: 'Cultural Globalization',
    content: 'Globalization has accelerated the exchange of cultural products, ideas, and practices across borders. Proponents argue that cultural exchange promotes mutual understanding, creativity, and the development of hybrid cultures that blend diverse traditions. However, critics warn of cultural homogenization — the process by which dominant cultures, often Western, overshadow local traditions. Languages are particularly vulnerable: of the approximately 7,000 languages currently spoken worldwide, linguists estimate that half may be extinct by 2100. Indigenous communities frequently report that their cultural practices and languages are being displaced by globalized media and education systems.',
    options: [
      { label: 'A', text: 'Cultural exchange can promote creativity and understanding.' },
      { label: 'B', text: 'Globalization only benefits developed countries.' },
      { label: 'C', text: 'Many languages may become extinct by 2100.' },
      { label: 'D', text: 'Indigenous cultures are unaffected by globalization.' },
      { label: 'E', text: 'Critics worry about cultural homogenization.' },
    ],
    correctAnswer: ['A', 'C', 'E'],
    level: QuestionLevel.HARD,
  },
  {
    code: 'RMCQM0004', skill: QuestionSkill.READING, type: QuestionType.READING_MCQ_MULTIPLE_ANSWER,
    title: 'Sleep and Health',
    content: 'Sleep is essential for physical and mental wellbeing. During sleep, the body repairs tissues, synthesizes proteins, and consolidates memories. Adults who regularly sleep fewer than seven hours per night face increased risks of obesity, diabetes, cardiovascular disease, and weakened immune function. Sleep deprivation also impairs cognitive performance, reaction time, and emotional regulation, making it a significant factor in workplace accidents and road traffic incidents. Despite widespread awareness of sleep\'s importance, modern lifestyles — characterized by artificial lighting, caffeine consumption, and digital screen use — frequently disrupt natural sleep patterns.',
    options: [
      { label: 'A', text: 'The body consolidates memories during sleep.' },
      { label: 'B', text: 'Sleeping fewer than seven hours has no health consequences.' },
      { label: 'C', text: 'Sleep deprivation can impair cognitive performance.' },
      { label: 'D', text: 'Digital screens can disrupt natural sleep patterns.' },
      { label: 'E', text: 'Sleep deprivation reduces the risk of obesity.' },
    ],
    correctAnswer: ['A', 'C', 'D'],
    level: QuestionLevel.MEDIUM, isRepeated: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // READING — RE-ORDER PARAGRAPHS (ROP)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'ROP0001', skill: QuestionSkill.READING, type: QuestionType.READING_RE_ORDER_PARAGRAPH,
    title: 'The Scientific Method',
    options: [
      { label: 'A', text: 'The scientific method is a systematic approach to acquiring knowledge through observation and experimentation.' },
      { label: 'B', text: 'First, a scientist identifies a problem or phenomenon that requires explanation.' },
      { label: 'C', text: 'A hypothesis is then formulated — a testable prediction about the expected outcome.' },
      { label: 'D', text: 'Experiments are designed and conducted to test this hypothesis under controlled conditions.' },
      { label: 'E', text: 'Finally, the results are analyzed and communicated to the scientific community for peer review.' },
    ],
    correctAnswer: ['A', 'B', 'C', 'D', 'E'],
    level: QuestionLevel.EASY,
  },
  {
    code: 'ROP0002', skill: QuestionSkill.READING, type: QuestionType.READING_RE_ORDER_PARAGRAPH,
    title: 'The Rise of E-Commerce',
    options: [
      { label: 'A', text: 'The rapid growth of e-commerce has transformed the global retail landscape over the past two decades.' },
      { label: 'B', text: 'Traditional brick-and-mortar retailers have faced increasing pressure as consumers shift their spending online.' },
      { label: 'C', text: 'The convenience of online shopping — including home delivery and easy price comparison — has proven irresistible to many consumers.' },
      { label: 'D', text: 'In response, many established retailers have adopted omnichannel strategies that blend physical and digital presence.' },
      { label: 'E', text: 'Whether this hybrid model will sustain traditional retail remains an open question as technology continues to evolve.' },
    ],
    correctAnswer: ['A', 'B', 'C', 'D', 'E'],
    level: QuestionLevel.MEDIUM, isTrending: true,
  },
  {
    code: 'ROP0003', skill: QuestionSkill.READING, type: QuestionType.READING_RE_ORDER_PARAGRAPH,
    title: 'Photosynthesis',
    options: [
      { label: 'A', text: 'Photosynthesis is the process by which plants convert light energy into chemical energy stored as glucose.' },
      { label: 'B', text: 'Chlorophyll, the green pigment found in plant cells, absorbs sunlight — particularly red and blue wavelengths.' },
      { label: 'C', text: 'This absorbed energy drives a series of chemical reactions that split water molecules, releasing oxygen as a byproduct.' },
      { label: 'D', text: 'The resulting glucose provides energy for plant growth and is the foundation of most food chains on Earth.' },
    ],
    correctAnswer: ['A', 'B', 'C', 'D'],
    level: QuestionLevel.MEDIUM,
  },
  {
    code: 'ROP0004', skill: QuestionSkill.READING, type: QuestionType.READING_RE_ORDER_PARAGRAPH,
    title: 'The Industrial Revolution',
    options: [
      { label: 'A', text: 'Beginning in Britain in the late eighteenth century, the Industrial Revolution marked a pivotal shift in human history.' },
      { label: 'B', text: 'The invention of the steam engine enabled factories to operate machinery at unprecedented scale and speed.' },
      { label: 'C', text: 'Mass production dramatically lowered the cost of goods, making previously luxury items accessible to broader populations.' },
      { label: 'D', text: 'However, rapid industrialization also created harsh working conditions, child labor, and severe urban pollution.' },
      { label: 'E', text: 'These social consequences ultimately gave rise to labor reform movements and the foundations of modern worker protection laws.' },
    ],
    correctAnswer: ['A', 'B', 'C', 'D', 'E'],
    level: QuestionLevel.HARD, isRepeated: true,
  },
  {
    code: 'ROP0005', skill: QuestionSkill.READING, type: QuestionType.READING_RE_ORDER_PARAGRAPH,
    title: 'Vaccination',
    options: [
      { label: 'A', text: 'Vaccination is one of the most successful public health interventions in human history.' },
      { label: 'B', text: 'Vaccines work by introducing a weakened or inactivated form of a pathogen to stimulate an immune response.' },
      { label: 'C', text: 'The immune system then produces antibodies that provide protection against future exposure to the disease.' },
      { label: 'D', text: 'When sufficient proportions of a population are vaccinated, herd immunity can protect even those who cannot be vaccinated.' },
    ],
    correctAnswer: ['A', 'B', 'C', 'D'],
    level: QuestionLevel.MEDIUM,
  },

  // ═══════════════════════════════════════════════════════════════
  // READING — MCQ Single Answer (RMCQS)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'RMCQS0001', skill: QuestionSkill.READING, type: QuestionType.READING_MCQ_SINGLE_ANSWER,
    title: 'The Amazon Rainforest',
    content: 'The Amazon rainforest covers approximately 5.5 million square kilometers across nine South American countries, with Brazil containing about 60% of the total area. Often called the "lungs of the Earth," it produces 20% of the world\'s oxygen and is home to an estimated 10% of all species on the planet. Deforestation, driven primarily by agricultural expansion and logging, has destroyed approximately 17% of the original forest cover. Scientists warn that if deforestation reaches 25%, the Amazon may pass a "tipping point" beyond which it cannot recover, triggering a conversion to dry savanna with catastrophic global consequences.',
    options: [
      { label: 'A', text: 'The Amazon has already been converted to savanna.' },
      { label: 'B', text: 'The Amazon covers most of North America.' },
      { label: 'C', text: 'At 25% deforestation, the Amazon may reach an irreversible tipping point.' },
      { label: 'D', text: 'Brazil contains only 10% of the Amazon rainforest.' },
    ],
    correctAnswer: 'C',
    level: QuestionLevel.MEDIUM,
  },
  {
    code: 'RMCQS0002', skill: QuestionSkill.READING, type: QuestionType.READING_MCQ_SINGLE_ANSWER,
    title: 'Migration Patterns',
    content: 'International migration has reached historic levels, with an estimated 281 million people living outside their country of birth in 2020. Economic opportunity is the most frequently cited motivation for migration, though conflict, persecution, and climate change are increasingly significant drivers. Contrary to popular belief, the majority of international migrants move between developing countries rather than from the developing to the developed world. Remittances — money sent by migrants to their home countries — now exceed foreign direct investment as a source of capital for many low-income nations, totaling over 700 billion USD annually.',
    options: [
      { label: 'A', text: 'Most migrants move from developing to developed countries.' },
      { label: 'B', text: 'Remittances are less economically significant than foreign direct investment.' },
      { label: 'C', text: 'Most international migration occurs between developing countries.' },
      { label: 'D', text: 'Climate change is the primary driver of international migration.' },
    ],
    correctAnswer: 'C',
    level: QuestionLevel.HARD, isTrending: true,
  },
  {
    code: 'RMCQS0003', skill: QuestionSkill.READING, type: QuestionType.READING_MCQ_SINGLE_ANSWER,
    title: 'Antibiotics',
    content: 'Antibiotics have been one of the most transformative discoveries in medical history, enabling the treatment of bacterial infections that were previously fatal. However, the overuse and misuse of antibiotics in human medicine and agriculture have accelerated the evolution of antibiotic-resistant bacteria. The World Health Organization has identified antimicrobial resistance as one of the greatest threats to global health. If current trends continue, drug-resistant infections could cause 10 million deaths annually by 2050, surpassing cancer as a leading cause of mortality.',
    options: [
      { label: 'A', text: 'Antibiotic resistance is caused only by misuse in agriculture.' },
      { label: 'B', text: 'Drug-resistant infections could cause 10 million deaths per year by 2050.' },
      { label: 'C', text: 'Antibiotics are ineffective against bacterial infections.' },
      { label: 'D', text: 'The WHO considers antibiotic resistance a minor health concern.' },
    ],
    correctAnswer: 'B',
    level: QuestionLevel.MEDIUM, isRepeated: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // READING — FIB Reading Only (RFIBR)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'RFIBR0001', skill: QuestionSkill.READING, type: QuestionType.READING_FIB_R,
    title: 'Neuroscience',
    content: 'The human brain exhibits remarkable __1__, the ability to reorganize itself by forming new neural connections throughout life. This property allows the brain to compensate for injury and adapt to new situations or changes in one\'s environment. Early childhood is considered a particularly __2__ period for brain development, during which experiences have an outsized influence on cognitive and emotional outcomes.',
    options: [
      { blank: '1', choices: ['neuroplasticity', 'rigidity', 'degeneration', 'symmetry'] },
      { blank: '2', choices: ['sensitive', 'irrelevant', 'stable', 'predictable'] },
    ],
    correctAnswer: { '1': 'neuroplasticity', '2': 'sensitive' },
    level: QuestionLevel.HARD,
  },
  {
    code: 'RFIBR0002', skill: QuestionSkill.READING, type: QuestionType.READING_FIB_R,
    title: 'Environmental Science',
    content: 'Deforestation refers to the permanent removal of trees to make land available for other __1__, such as agriculture, livestock, and urban development. Forests play a critical role in regulating the Earth\'s climate by absorbing carbon dioxide through __2__. Their destruction therefore both releases stored carbon and reduces the planet\'s capacity to absorb future emissions.',
    options: [
      { blank: '1', choices: ['uses', 'forests', 'ecosystems', 'species'] },
      { blank: '2', choices: ['photosynthesis', 'respiration', 'decomposition', 'evaporation'] },
    ],
    correctAnswer: { '1': 'uses', '2': 'photosynthesis' },
    level: QuestionLevel.EASY,
  },
  {
    code: 'RFIBR0003', skill: QuestionSkill.READING, type: QuestionType.READING_FIB_R,
    title: 'History of Democracy',
    content: 'Ancient Athens is widely credited as the birthplace of __1__, a system of government in which citizens participate directly in decision-making. However, Athenian democracy excluded women, slaves, and foreign residents, meaning it applied to only a small __2__ of the total population.',
    options: [
      { blank: '1', choices: ['democracy', 'monarchy', 'oligarchy', 'theocracy'] },
      { blank: '2', choices: ['fraction', 'majority', 'entirety', 'generation'] },
    ],
    correctAnswer: { '1': 'democracy', '2': 'fraction' },
    level: QuestionLevel.MEDIUM,
  },

  // ═══════════════════════════════════════════════════════════════
  // LISTENING — DICTATION (WFD)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'WFD0001', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_DICTATION,
    title: 'Dictation 1',
    content: 'The assignment is due at the end of the week.',
    level: QuestionLevel.EASY, responseTime: 40, isTrending: true,
  },
  {
    code: 'WFD0002', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_DICTATION,
    title: 'Dictation 2',
    content: 'Students should review their notes before the examination.',
    level: QuestionLevel.EASY, responseTime: 40,
  },
  {
    code: 'WFD0003', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_DICTATION,
    title: 'Dictation 3',
    content: 'The results of the experiment were presented at the annual conference.',
    level: QuestionLevel.MEDIUM, responseTime: 40, isRepeated: true,
  },
  {
    code: 'WFD0004', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_DICTATION,
    title: 'Dictation 4',
    content: 'International cooperation is essential for addressing global environmental challenges.',
    level: QuestionLevel.MEDIUM, responseTime: 40,
  },
  {
    code: 'WFD0005', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_DICTATION,
    title: 'Dictation 5',
    content: 'The professor emphasized the importance of critical thinking in academic research.',
    level: QuestionLevel.MEDIUM, responseTime: 40, isTrending: true,
  },
  {
    code: 'WFD0006', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_DICTATION,
    title: 'Dictation 6',
    content: 'Economic inequality has widened significantly over the past three decades.',
    level: QuestionLevel.MEDIUM, responseTime: 40,
  },
  {
    code: 'WFD0007', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_DICTATION,
    title: 'Dictation 7',
    content: 'The library provides access to thousands of academic journals and databases.',
    level: QuestionLevel.EASY, responseTime: 40,
  },
  {
    code: 'WFD0008', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_DICTATION,
    title: 'Dictation 8',
    content: 'Advances in biotechnology have transformed the field of personalized medicine.',
    level: QuestionLevel.HARD, responseTime: 40,
  },
  {
    code: 'WFD0009', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_DICTATION,
    title: 'Dictation 9',
    content: 'Urban planners must balance the needs of current residents with long-term sustainability goals.',
    level: QuestionLevel.HARD, responseTime: 40, isRepeated: true,
  },
  {
    code: 'WFD0010', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_DICTATION,
    title: 'Dictation 10',
    content: 'The scholarship application requires two letters of recommendation from academic supervisors.',
    level: QuestionLevel.MEDIUM, responseTime: 40,
  },

  // ═══════════════════════════════════════════════════════════════
  // LISTENING — FIB Listening (LFIB)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'LFIB0001', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_FIB_L,
    title: 'Lecture: Climate Science',
    content: 'Today we\'re going to discuss the concept of the carbon __1__. Essentially, this refers to the cycle by which carbon moves through the Earth\'s atmosphere, oceans, and land. Human activities, particularly the burning of __2__ fuels, have significantly disrupted this natural cycle, leading to elevated levels of carbon dioxide in the __3__.',
    options: [
      { blank: '1', choices: ['cycle', 'footprint', 'sink', 'budget'] },
      { blank: '2', choices: ['fossil', 'nuclear', 'renewable', 'synthetic'] },
      { blank: '3', choices: ['atmosphere', 'ocean', 'soil', 'biosphere'] },
    ],
    correctAnswer: { '1': 'cycle', '2': 'fossil', '3': 'atmosphere' },
    level: QuestionLevel.MEDIUM,
  },
  {
    code: 'LFIB0002', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_FIB_L,
    title: 'Lecture: Psychology',
    content: 'In today\'s lecture, we\'ll be looking at Maslow\'s hierarchy of __1__. Maslow proposed that human motivation operates on a pyramid of needs, beginning with basic __2__ needs like food and shelter, and progressing toward higher-order needs such as self-__3__.',
    options: [
      { blank: '1', choices: ['needs', 'goals', 'values', 'behaviors'] },
      { blank: '2', choices: ['physiological', 'emotional', 'cognitive', 'social'] },
      { blank: '3', choices: ['actualization', 'esteem', 'regulation', 'awareness'] },
    ],
    correctAnswer: { '1': 'needs', '2': 'physiological', '3': 'actualization' },
    level: QuestionLevel.MEDIUM, isTrending: true,
  },
  {
    code: 'LFIB0003', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_FIB_L,
    title: 'Lecture: Economics',
    content: 'The concept of __1__ elasticity measures how sensitive consumer demand is to a change in price. When demand is highly elastic, a small price increase causes a large __2__ in quantity demanded. Products that are considered necessities tend to be __3__ elastic, meaning consumers will buy them regardless of price changes.',
    options: [
      { blank: '1', choices: ['price', 'income', 'cross', 'supply'] },
      { blank: '2', choices: ['decrease', 'increase', 'fluctuation', 'stabilization'] },
      { blank: '3', choices: ['inelastic', 'elastic', 'perfectly', 'relatively'] },
    ],
    correctAnswer: { '1': 'price', '2': 'decrease', '3': 'inelastic' },
    level: QuestionLevel.HARD,
  },
  {
    code: 'LFIB0004', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_FIB_L,
    title: 'Lecture: History',
    content: 'The __1__ Revolution, which began in the late eighteenth century, transformed Britain from an agricultural to an industrial society. Central to this transformation was the invention of the steam __2__, which powered factories, mines, and eventually locomotives. This period saw mass __3__ from rural areas to cities as workers sought employment in the new industrial centers.',
    options: [
      { blank: '1', choices: ['Industrial', 'Agricultural', 'French', 'Digital'] },
      { blank: '2', choices: ['engine', 'press', 'loom', 'pump'] },
      { blank: '3', choices: ['migration', 'emigration', 'immigration', 'evacuation'] },
    ],
    correctAnswer: { '1': 'Industrial', '2': 'engine', '3': 'migration' },
    level: QuestionLevel.EASY, isRepeated: true,
  },
  {
    code: 'LFIB0005', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_FIB_L,
    title: 'Lecture: Environmental Science',
    content: 'Coral reefs are among the most __1__ ecosystems on Earth, supporting approximately 25% of all marine species despite covering less than 1% of the ocean floor. They are highly sensitive to changes in water temperature; even a rise of just one or two degrees can cause coral __2__, a phenomenon in which corals expel the algae living in their tissues, turning them white. If the stress persists, the corals may __3__ entirely.',
    options: [
      { blank: '1', choices: ['biodiverse', 'barren', 'simple', 'isolated'] },
      { blank: '2', choices: ['bleaching', 'spawning', 'migration', 'calcification'] },
      { blank: '3', choices: ['die', 'thrive', 'multiply', 'adapt'] },
    ],
    correctAnswer: { '1': 'biodiverse', '2': 'bleaching', '3': 'die' },
    level: QuestionLevel.HARD, isTrending: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // LISTENING — MCQ Single Answer (LMCQS)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'LMCQS0001', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_MCQ_SINGLE_ANSWER,
    title: 'Lecture: Nutrition',
    content: 'Listen to a lecture about nutrition. According to the recording, what is the primary function of dietary fiber?',
    options: [
      { label: 'A', text: 'To provide energy for daily activities.' },
      { label: 'B', text: 'To support digestive health and regulate blood sugar.' },
      { label: 'C', text: 'To build muscle tissue after exercise.' },
      { label: 'D', text: 'To absorb vitamins from other foods.' },
    ],
    correctAnswer: 'B',
    level: QuestionLevel.MEDIUM,
    suggestedAnswer: 'Dietary fiber primarily supports digestive health by adding bulk to stool and feeds beneficial gut bacteria, while also slowing glucose absorption to regulate blood sugar levels.',
  },
  {
    code: 'LMCQS0002', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_MCQ_SINGLE_ANSWER,
    title: 'Lecture: Astronomy',
    content: 'Listen to a discussion about black holes. What does the lecturer identify as the defining characteristic of a black hole?',
    options: [
      { label: 'A', text: 'Its extremely large size.' },
      { label: 'B', text: 'Its gravitational pull is so strong that not even light can escape.' },
      { label: 'C', text: 'It emits intense radiation visible from Earth.' },
      { label: 'D', text: 'It is located at the center of all galaxies.' },
    ],
    correctAnswer: 'B',
    level: QuestionLevel.EASY,
  },
  {
    code: 'LMCQS0003', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_MCQ_SINGLE_ANSWER,
    title: 'Lecture: Sociology',
    content: 'Listen to a talk about social mobility. What does the speaker suggest is the main barrier to upward social mobility in many countries?',
    options: [
      { label: 'A', text: 'Lack of individual ambition.' },
      { label: 'B', text: 'Insufficient educational opportunities for lower-income groups.' },
      { label: 'C', text: 'Excessive immigration.' },
      { label: 'D', text: 'Overpopulation in urban areas.' },
    ],
    correctAnswer: 'B',
    level: QuestionLevel.HARD, isTrending: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // LISTENING — MCQ Multiple Answer (LMCQM)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'LMCQM0001', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_MCQ_MULTIPLE_ANSWER,
    title: 'Lecture: Sustainable Development',
    content: 'Listen to a lecture on sustainable development. Which of the following are mentioned as key pillars of sustainable development?',
    options: [
      { label: 'A', text: 'Economic growth' },
      { label: 'B', text: 'Military strength' },
      { label: 'C', text: 'Environmental protection' },
      { label: 'D', text: 'Social equity' },
      { label: 'E', text: 'Technological dominance' },
    ],
    correctAnswer: ['A', 'C', 'D'],
    level: QuestionLevel.MEDIUM, isTrending: true,
  },
  {
    code: 'LMCQM0002', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_MCQ_MULTIPLE_ANSWER,
    title: 'Lecture: Migration',
    content: 'Listen to a discussion on international migration. Which factors does the speaker identify as contributing to increased migration?',
    options: [
      { label: 'A', text: 'Climate change and environmental disasters' },
      { label: 'B', text: 'Declining global population' },
      { label: 'C', text: 'Armed conflict and political persecution' },
      { label: 'D', text: 'Economic inequality between nations' },
      { label: 'E', text: 'Decreasing access to information technology' },
    ],
    correctAnswer: ['A', 'C', 'D'],
    level: QuestionLevel.HARD,
  },
  {
    code: 'LMCQM0003', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_MCQ_MULTIPLE_ANSWER,
    title: 'Lecture: Digital Health',
    content: 'Listen to a talk about digital health technologies. Which benefits of digital health are mentioned?',
    options: [
      { label: 'A', text: 'Remote patient monitoring' },
      { label: 'B', text: 'Elimination of all medical errors' },
      { label: 'C', text: 'Improved access to healthcare in remote areas' },
      { label: 'D', text: 'Personalized treatment through data analysis' },
      { label: 'E', text: 'Complete replacement of human doctors' },
    ],
    correctAnswer: ['A', 'C', 'D'],
    level: QuestionLevel.MEDIUM,
  },

  // ═══════════════════════════════════════════════════════════════
  // LISTENING — HIGHLIGHT CORRECT SUMMARY (HCS)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'HCS0001', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_HIGHLIGHT_CORRECT_SUMMARY,
    title: 'Lecture: Renewable Energy Transition',
    content: 'A lecture discusses the global transition to renewable energy, covering current progress, economic challenges, and future prospects.',
    options: [
      { label: 'A', text: 'The lecture argues that renewable energy is too expensive and will never replace fossil fuels.' },
      { label: 'B', text: 'The lecture discusses the ongoing global shift to renewable energy, noting that despite falling costs, challenges remain in grid integration and energy storage.' },
      { label: 'C', text: 'The lecture focuses exclusively on solar power as the solution to climate change.' },
      { label: 'D', text: 'The lecture concludes that nuclear energy is the only viable replacement for fossil fuels.' },
    ],
    correctAnswer: 'B',
    level: QuestionLevel.MEDIUM, isTrending: true,
  },
  {
    code: 'HCS0002', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_HIGHLIGHT_CORRECT_SUMMARY,
    title: 'Lecture: Artificial Intelligence in Healthcare',
    content: 'A talk covering the applications, benefits, and ethical concerns surrounding AI use in medical diagnosis and treatment.',
    options: [
      { label: 'A', text: 'The talk argues that AI will completely replace doctors within a decade.' },
      { label: 'B', text: 'The speaker dismisses AI in healthcare as a passing trend with no real applications.' },
      { label: 'C', text: 'The lecture explores AI\'s promising applications in diagnosis and treatment while acknowledging ethical concerns about bias and accountability.' },
      { label: 'D', text: 'The talk concludes that healthcare AI is only useful in wealthy countries.' },
    ],
    correctAnswer: 'C',
    level: QuestionLevel.HARD,
  },
  {
    code: 'HCS0003', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_HIGHLIGHT_CORRECT_SUMMARY,
    title: 'Lecture: Ocean Conservation',
    content: 'A presentation on the state of ocean health, including threats from pollution, overfishing, and climate change, and proposed conservation strategies.',
    options: [
      { label: 'A', text: 'The presentation argues that ocean pollution is entirely the result of industrial activity.' },
      { label: 'B', text: 'The lecture outlines multiple threats to ocean health including pollution, overfishing, and warming temperatures, and calls for international conservation efforts.' },
      { label: 'C', text: 'The speaker claims that oceans are recovering well and no intervention is needed.' },
      { label: 'D', text: 'The talk focuses exclusively on the impact of plastic pollution on sea turtles.' },
    ],
    correctAnswer: 'B',
    level: QuestionLevel.MEDIUM, isRepeated: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // LISTENING — SELECT MISSING WORD (SMW)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'SMW0001', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_SELECT_MISSING_WORD,
    title: 'Select Missing Word 1',
    content: 'The research team concluded that regular exercise not only improves physical fitness but also significantly enhances...',
    options: [
      { label: 'A', text: 'financial stability' },
      { label: 'B', text: 'mental wellbeing and cognitive function' },
      { label: 'C', text: 'agricultural productivity' },
      { label: 'D', text: 'architectural design skills' },
    ],
    correctAnswer: 'B',
    level: QuestionLevel.EASY,
  },
  {
    code: 'SMW0002', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_SELECT_MISSING_WORD,
    title: 'Select Missing Word 2',
    content: 'As global temperatures continue to rise, scientists warn that many coastal cities may face severe flooding due to...',
    options: [
      { label: 'A', text: 'increased tourism activity' },
      { label: 'B', text: 'declining urban populations' },
      { label: 'C', text: 'rising sea levels caused by melting ice caps' },
      { label: 'D', text: 'improvements in water management' },
    ],
    correctAnswer: 'C',
    level: QuestionLevel.EASY, isTrending: true,
  },
  {
    code: 'SMW0003', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_SELECT_MISSING_WORD,
    title: 'Select Missing Word 3',
    content: 'The economic report highlighted that the wealth gap between the richest and poorest segments of society has widened as a result of...',
    options: [
      { label: 'A', text: 'improved social welfare programs' },
      { label: 'B', text: 'technological automation displacing low-skill workers' },
      { label: 'C', text: 'declining corporate profits' },
      { label: 'D', text: 'reduced international trade' },
    ],
    correctAnswer: 'B',
    level: QuestionLevel.HARD,
  },
  {
    code: 'SMW0004', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_SELECT_MISSING_WORD,
    title: 'Select Missing Word 4',
    content: 'Linguists have found that children who grow up in bilingual households demonstrate greater cognitive flexibility and...',
    options: [
      { label: 'A', text: 'difficulty with mathematical reasoning' },
      { label: 'B', text: 'reduced social interaction with peers' },
      { label: 'C', text: 'stronger metalinguistic awareness' },
      { label: 'D', text: 'preference for visual learning' },
    ],
    correctAnswer: 'C',
    level: QuestionLevel.MEDIUM,
  },
  {
    code: 'SMW0005', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_SELECT_MISSING_WORD,
    title: 'Select Missing Word 5',
    content: 'The documentary explored how deforestation in tropical regions affects not only local biodiversity but also...',
    options: [
      { label: 'A', text: 'global carbon cycles and climate patterns' },
      { label: 'B', text: 'the cost of consumer electronics' },
      { label: 'C', text: 'international sports competitions' },
      { label: 'D', text: 'urban traffic congestion' },
    ],
    correctAnswer: 'A',
    level: QuestionLevel.MEDIUM, isRepeated: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // LISTENING — HIGHLIGHT INCORRECT WORD (HIW)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'HIW0001', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_HIGHLIGHT_INCORRECT_WORD,
    title: 'Incorrect Word 1',
    content: 'The sun rises in the west every morning and sets in the east every evening providing light and heat to our planet.',
    correctAnswer: ['west', 'east'],
    level: QuestionLevel.EASY,
    tips: 'The correct words are "east" and "west" respectively.',
  },
  {
    code: 'HIW0002', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_HIGHLIGHT_INCORRECT_WORD,
    title: 'Incorrect Word 2',
    content: 'Water freezes at one hundred degrees Celsius and boils at zero degrees Celsius at standard atmospheric pressure.',
    correctAnswer: ['one hundred', 'zero'],
    level: QuestionLevel.EASY,
    tips: 'Water freezes at 0°C and boils at 100°C.',
  },
  {
    code: 'HIW0003', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_HIGHLIGHT_INCORRECT_WORD,
    title: 'Incorrect Word 3',
    content: 'The Amazon River the longest river in the world flows through South America releasing fresh water into the Atlantic Ocean.',
    correctAnswer: ['longest'],
    level: QuestionLevel.MEDIUM,
    tips: 'The Amazon is the largest by volume, but the Nile is longer.',
  },
  {
    code: 'HIW0004', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_HIGHLIGHT_INCORRECT_WORD,
    title: 'Incorrect Word 4',
    content: 'Photosynthesis is the process by which plants use sunlight water and oxygen to produce glucose and carbon dioxide.',
    correctAnswer: ['oxygen', 'carbon dioxide'],
    level: QuestionLevel.MEDIUM, isRepeated: true,
    tips: 'Plants use CO2 and produce O2, not the other way around.',
  },
  {
    code: 'HIW0005', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_HIGHLIGHT_INCORRECT_WORD,
    title: 'Incorrect Word 5',
    content: 'The United Nations was founded in 1945 after World War One to promote international peace security and cooperation.',
    correctAnswer: ['One'],
    level: QuestionLevel.EASY,
    tips: 'The UN was founded after World War Two.',
  },

  // ═══════════════════════════════════════════════════════════════
  // LISTENING — SUMMARIZE SPOKEN TEXT (SST)
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'SST0001', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_SUMMARIZE_SPOKEN_TEXT,
    title: 'Lecture: The Digital Divide',
    content: 'A lecture discussing the digital divide — the gap between those who have access to digital technologies and those who do not. The speaker covers economic, geographic, and generational factors that contribute to this inequality, and discusses initiatives to close the gap through affordable internet access and digital literacy programs.',
    level: QuestionLevel.MEDIUM, minWords: 50, maxWords: 70,
    suggestedAnswer: 'The lecture examines the digital divide, describing how economic disparities, geographic isolation, and generational differences limit access to technology for significant portions of the global population. The speaker advocates for targeted initiatives including subsidized internet access and digital literacy training to address this growing form of inequality.',
    isTrending: true,
  },
  {
    code: 'SST0002', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_SUMMARIZE_SPOKEN_TEXT,
    title: 'Lecture: Food Security',
    content: 'A talk covering global food security challenges, including population growth, climate change impacts on agriculture, food waste, and the potential of sustainable farming practices and technology to ensure adequate nutrition for all people.',
    level: QuestionLevel.HARD, minWords: 50, maxWords: 70,
    suggestedAnswer: 'The talk addresses global food security, identifying population growth, climate-related agricultural disruption, and food waste as major threats. The speaker highlights sustainable farming innovations and technology as promising solutions to ensure nutritional adequacy for a growing world population.',
    isRepeated: true,
  },
  {
    code: 'SST0003', skill: QuestionSkill.LISTENING, type: QuestionType.LISTENING_SUMMARIZE_SPOKEN_TEXT,
    title: 'Lecture: Mental Health Awareness',
    content: 'A university lecture on mental health awareness, discussing rising rates of anxiety and depression among young adults, the stigma surrounding mental health treatment, and the importance of early intervention, accessible counseling services, and supportive campus environments.',
    level: QuestionLevel.MEDIUM, minWords: 50, maxWords: 70,
    suggestedAnswer: 'The lecture highlights increasing rates of anxiety and depression among young adults, attributing delayed treatment to persistent social stigma. The speaker emphasizes early intervention, expanded counseling services, and the creation of supportive educational environments as essential strategies for improving student mental health outcomes.',
  },
];

async function seed() {
  await ds.initialize();
  console.log('✅ Database connected');

  // Seed admin user
  const userRepo = ds.getRepository(User);
  const adminEmail = 'admin@flyedu.com';
  const existingAdmin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash('Admin@123', 10);
    await userRepo.save(userRepo.create({
      email: adminEmail,
      fullName: 'Admin',
      password: hashed,
      plan: UserPlan.PREMIUM,
    }));
    console.log('✅ Admin user created: admin@flyedu.com / Admin@123');
  } else {
    console.log('⏭ Admin user already exists, skipped');
  }

  // Seed demo user (reset password)
  const demoEmail = 'vu@gmail.com';
  let demoUser = await userRepo.findOne({ where: { email: demoEmail } });
  if (!demoUser) {
    const hashed = await bcrypt.hash('123456', 10);
    demoUser = await userRepo.save(userRepo.create({
      email: demoEmail,
      fullName: 'Vũ Nguyễn',
      password: hashed,
      plan: UserPlan.FREE,
    }));
    console.log('✅ Demo user created: vu@gmail.com / 123456');
  } else {
    // Reset password for existing user
    const hashed = await bcrypt.hash('123456', 10);
    demoUser.password = hashed;
    await userRepo.save(demoUser);
    console.log('✅ Demo user password reset: vu@gmail.com / 123456');
  }

  // Seed questions
  const repo = ds.getRepository(Question);
  let inserted = 0;
  let skipped = 0;

  for (const q of questions) {
    const exists = await repo.findOne({ where: { code: q.code } });
    if (exists) {
      skipped++;
      continue;
    }
    await repo.save(repo.create(q));
    inserted++;
  }

  console.log(`✅ Seed complete: ${inserted} inserted, ${skipped} skipped (already existed)`);
  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
