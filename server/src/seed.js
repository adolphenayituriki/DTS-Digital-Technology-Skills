import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Member from "./models/Member.js";
import Post from "./models/Post.js";
import Testimonial from "./models/Testimonial.js";
import Intake from "./models/Intake.js";

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected for seeding");

    await User.deleteMany({});
    await Member.deleteMany({});
    await Post.deleteMany({});
    await Testimonial.deleteMany({});
    await Intake.deleteMany({});
    console.log("Cleared existing data");

    const admin = await User.create({
      name: "DTS Admin",
      email: "admin@dts.rw",
      password: "admin123",
      role: "admin",
    });
    console.log("Admin user created");

    const members = await Member.insertMany([
      {
        name: "Jean-Pierre Niyonzima",
        role: "Chairperson",
        bio: "Visionary leader with over 15 years of experience in ICT development across East Africa.",
        email: "chairperson@dts.rw",
        isLeadership: true,
        order: 1,
      },
      {
        name: "Marie Claire Uwimana",
        role: "Vice Chairperson",
        bio: "Dedicated professional specializing in digital transformation and capacity building.",
        email: "vicechair@dts.rw",
        isLeadership: true,
        order: 2,
      },
      {
        name: "Emmanuel Habimana",
        role: "Secretary General",
        bio: "Experienced administrator with a passion for community engagement and organizational development.",
        email: "secretary@dts.rw",
        isLeadership: true,
        order: 3,
      },
      {
        name: "Ange Iradukunda",
        role: "Treasurer",
        bio: "Financial expert committed to transparent management and sustainable growth of the association.",
        email: "treasurer@dts.rw",
        isLeadership: true,
        order: 4,
      },
      {
        name: "Patrick Mugisha",
        role: "Lead Trainer",
        bio: "Certified ICT trainer with expertise in cybersecurity, networking, and software development.",
        email: "trainer@dts.rw",
        isLeadership: true,
        order: 5,
      },
    ]);
    console.log(`${members.length} members created`);

    const posts = await Post.create([
      {
        title: "DTS Annual General Meeting 2026",
        content:
          "<p>The Digital Technology Skills Association is pleased to announce its Annual General Meeting scheduled for March 2026. All members are invited to attend and participate in shaping the future of ICT skills development in Rwanda.</p><p>Key agenda items include election of new board members, review of annual activities, and strategic planning for the coming year.</p>",
        excerpt:
          "Join us for the DTS Annual General Meeting to shape the future of ICT skills development in Rwanda.",
        category: "announcement",
        isPublished: true,
        author: admin._id,
      },
      {
        title: "New Cybersecurity Training Program Launched",
        content:
          "<p>DTS is excited to launch a comprehensive cybersecurity training program aimed at equipping Rwandan professionals with essential skills to protect digital infrastructure.</p><p>The program covers network security, ethical hacking, incident response, and compliance frameworks. Registration is now open for the first cohort.</p>",
        excerpt:
          "DTS launches a comprehensive cybersecurity training program for Rwandan professionals.",
        category: "news",
        isPublished: true,
        author: admin._id,
      },
      {
        title: "DTS Partners with Rwanda ICT Chamber",
        content:
          "<p>The Digital Technology Skills Association has signed a memorandum of understanding with the Rwanda ICT Chamber to collaborate on skills development initiatives.</p><p>This partnership will create new opportunities for DTS members including internships, job placements, and access to industry events.</p>",
        excerpt:
          "DTS signs MOU with Rwanda ICT Chamber for collaborative skills development initiatives.",
        category: "news",
        isPublished: true,
        author: admin._id,
      },
    ]);
    console.log(`${posts.length} posts created`);

    const testimonials = await Testimonial.create([
      {
        name: "Claude Niyongabo",
        role: "Software Developer",
        content:
          "The DTS training program transformed my career. I went from knowing basic computer skills to becoming a full-stack developer in just six months. The trainers are experienced and the curriculum is industry-relevant.",
        rating: 5,
        isApproved: true,
      },
      {
        name: "Diane Uwimana",
        role: "Network Engineer",
        content:
          "Thanks to DTS, I earned my CCNA certification and secured a position at a leading telecom company. The hands-on labs and mentorship program made all the difference.",
        rating: 5,
        isApproved: true,
      },
      {
        name: "Eric Mugiraneza",
        role: "IT Manager",
        content:
          "DTS provides excellent professional development opportunities. Their workshops on cloud computing and DevOps practices have been invaluable for our team's growth.",
        rating: 4,
        isApproved: true,
      },
      {
        name: "Josiane Mukamana",
        role: "Digital Marketer",
        content:
          "The digital marketing skills I gained through DTS helped me launch my own agency. Their support doesn't end with training - they continue to connect members with opportunities.",
        rating: 5,
        isApproved: true,
      },
    ]);
    console.log(`${testimonials.length} testimonials created`);

    const intakes = await Intake.insertMany([
      {
        title: "Basic Level · Intake 2026–2027",
        program: "Basic Level",
        description:
          "Build your digital foundation with hands-on training in Google Services, Microsoft Office, and Online Job Applications. Ideal for beginners and students looking to start their digital skills journey.",
        courses: ["Google Services", "Microsoft Office", "Online Job Applications"],
        startDate: new Date("2026-11-01"),
        endDate: new Date("2027-07-31"),
        deadline: new Date("2026-10-25"),
        capacity: 60,
        enrolled: 20,
        status: "open",
      },
      {
        title: "Advanced Level · Intake 2026–2027",
        program: "Advanced Level",
        description:
          "Take your skills to the next level with Photo & Video Editing, Computer Maintenance, and Computer Graphics. Designed for learners ready for professional and creative digital work.",
        courses: ["Photo & Video Editing", "Computer Maintenance", "Computer Graphics"],
        startDate: new Date("2026-11-01"),
        endDate: new Date("2027-07-31"),
        deadline: new Date("2026-10-25"),
        capacity: 60,
        enrolled: 14,
        status: "open",
      },
    ]);
    console.log(`${intakes.length} intakes created (Basic Level & Advanced Level)`);
    console.log("Intakes 2026–2027 with per-level courses created");

    await Post.create({
      title: "How to Apply for DTS Intake 2026–2027",
      content:
        "<p>Applications for the Digital Technology Skills 2026–2027 intake are now open at two levels. Follow these simple steps to apply and begin your digital skills training journey.</p><p>Choose the <strong>Basic Level</strong> (Google Services, Microsoft Office, Online Job Applications) or the <strong>Advanced Level</strong> (Photo & Video Editing, Computer Maintenance, Computer Graphics). Each training runs for 2–3 months, with certificates awarded on completion.</p>",
      excerpt:
        "Step-by-step guide to applying for the DTS 2026–2027 intake program.",
      category: "announcement",
      isPublished: true,
      author: admin._id,
      steps: [
        {
          title: "Browse Open Intakes",
          description:
            "Visit the Apply page and review the available intakes. Choose between the Basic Level intake and the Advanced Level intake.",
        },
        {
          title: "Choose Your Level and Course",
          description:
            "Each level has its own courses. Basic Level offers Google Services, Microsoft Office, and Online Job Applications. Advanced Level offers Photo & Video Editing, Computer Maintenance, and Computer Graphics.",
        },
        {
          title: "Fill Out the Application Form",
          description:
            "Click Apply on your chosen intake and complete the form with your name, email, phone, campus, your preferred course, and a short motivation.",
        },
        {
          title: "Submit Your Application",
          description:
            "Review your details and click Submit. You will see a confirmation message once your application has been received.",
        },
        {
          title: "Wait for Review",
          description:
            "Our team will review all applications and notify you of the outcome before the deadline.",
        },
      ],
    });
    console.log("Intake 2026–2027 article with steps created");

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error.message);
    process.exit(1);
  }
};

seed();
