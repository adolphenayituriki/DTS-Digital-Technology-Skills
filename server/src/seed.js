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
        name: "Adolphe Nayituriki",
        role: "President",
        bio: "Leading DTS since its founding in 2022. Passionate about digital literacy and youth empowerment in Rwanda.",
        email: "www.nayituriki.com@gmail.com",
        photo: "/Teams/ELITEFRAMSTUDIO(123).jpg",
        isLeadership: true,
        order: 1,
      },
      {
        name: "Elizabeth Kamugisha",
        role: "Vice President",
        bio: "Oversees training programs and student engagement. Dedicated to bridging the digital divide in rural communities.",
        email: "elizabethkamugisha105@gmail.com",
        photo: "/Teams/ELITEFRAMSTUDIO(124).jpg",
        isLeadership: true,
        order: 2,
      },
      {
        name: "Bernard Ndagiijimana",
        role: "Training Coordinator",
        bio: "Coordinates curriculum delivery and trainer assignments. Ensures quality hands-on learning experiences.",
        email: "ndagijimanabernard11@gmail.com",
        isLeadership: false,
        order: 3,
      },
    ]);
    console.log(`${members.length} members created`);

    const posts = await Post.create([]);
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
      featuredImage: "/activity-1.jpg",
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
