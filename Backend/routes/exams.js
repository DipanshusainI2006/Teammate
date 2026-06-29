const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");

// Static Exam Catalog
const exams = {
  python: {
    id: "python",
    name: "Python Programming",
    description: "Validate your knowledge of core Python syntax, data structures, and standard libraries.",
    questions: [
      {
        id: 1,
        text: "What is the correct syntax to output 'Hello World' in Python?",
        options: ["print('Hello World')", "echo('Hello World');", "printf('Hello World')", "System.out.println('Hello World')"],
        answer: 0
      },
      {
        id: 2,
        text: "Which of the following is an immutable data type in Python?",
        options: ["List", "Dictionary", "Set", "Tuple"],
        answer: 3
      },
      {
        id: 3,
        text: "How do you start a single-line comment in Python?",
        options: ["//", "/*", "#", "--"],
        answer: 2
      },
      {
        id: 4,
        text: "What does the len() function do?",
        options: ["Returns the memory size of an object", "Returns the number of items in an object", "Converts an object to a string", "Generates a sequence of numbers"],
        answer: 1
      },
      {
        id: 5,
        text: "Which keyword is used to define a function in Python?",
        options: ["function", "void", "def", "create"],
        answer: 2
      }
    ]
  },
  ml: {
    id: "ml",
    name: "Machine Learning",
    description: "Test your understanding of supervised/unsupervised algorithms, evaluation metrics, and basic concepts.",
    questions: [
      {
        id: 1,
        text: "What type of machine learning uses labeled data for model training?",
        options: ["Unsupervised Learning", "Supervised Learning", "Reinforcement Learning", "Semi-supervised Learning"],
        answer: 1
      },
      {
        id: 2,
        text: "Which algorithm is commonly used for classification tasks?",
        options: ["Linear Regression", "Logistic Regression", "K-Means", "Principal Component Analysis"],
        answer: 1
      },
      {
        id: 3,
        text: "What is the primary purpose of cross-validation in machine learning?",
        options: ["To reduce data storage requirements", "To train models faster", "To evaluate model generalization and prevent overfitting", "To label unlabeled data"],
        answer: 2
      },
      {
        id: 4,
        text: "In machine learning, what does 'bias' refer to?",
        options: ["The speed at which the model trains", "Simplifying assumptions made by the model to make target functions easier to learn", "The variance of predictions on testing data", "None of the above"],
        answer: 1
      },
      {
        id: 5,
        text: "Which of the following is an unsupervised clustering algorithm?",
        options: ["Support Vector Machine", "Random Forest", "Gradient Boosting", "K-Means"],
        answer: 3
      }
    ]
  },
  webdev: {
    id: "webdev",
    name: "Web Development",
    description: "Assess your knowledge of standard web technologies: HTML5, CSS3 properties, and modern JavaScript.",
    questions: [
      {
        id: 1,
        text: "What does HTML stand for?",
        options: ["HyperText Markup Language", "Hyperlinks and Text Markup Language", "Home Tool Markup Language", "Hyper Tool Multi Language"],
        answer: 0
      },
      {
        id: 2,
        text: "Which CSS property controls the text size?",
        options: ["text-style", "font-size", "text-size", "font-style"],
        answer: 1
      },
      {
        id: 3,
        text: "How do you write a popup box message in standard browser JavaScript?",
        options: ["msgBox('Hello');", "confirm('Hello');", "prompt('Hello');", "alert('Hello');"],
        answer: 3
      },
      {
        id: 4,
        text: "What is the primary purpose of semantic HTML5 tags like <article> or <section>?",
        options: ["To apply automatic modern styles to text", "To give meaning to the structure of the document for browsers, screen readers, and SEO", "To execute client-side scripts automatically", "To optimize loading speeds of images"],
        answer: 1
      },
      {
        id: 5,
        text: "Which HTTP method is typically designed to update an existing resource or collection?",
        options: ["GET", "POST", "PUT", "DELETE"],
        answer: 2
      }
    ]
  },
  uiux: {
    id: "uiux",
    name: "UI/UX Design",
    description: "Verify your understanding of UI layouts, contrast ratios, user research, and interactive prototyping principles.",
    questions: [
      {
        id: 1,
        text: "What does UX stand for in design terminology?",
        options: ["User Experience", "User eXtension", "Unit eXchange", "Universal Xenon"],
        answer: 0
      },
      {
        id: 2,
        text: "What is a 'wireframe' in UI/UX design?",
        options: ["The backend code linking interactive UI components", "A low-fidelity visual guide of a webpage or application layout", "A high-fidelity graphical mockup with complete branding", "A framework used to write responsive CSS code"],
        answer: 1
      },
      {
        id: 3,
        text: "Which statement best describes the primary goal of 'User Research'?",
        options: ["Writing documentation for code reviewers", "Understanding user behaviors, needs, pain points, and motivations through qualitative and quantitative methods", "Designing eye-catching animated landing pages", "Tracking app crash logs in production servers"],
        answer: 1
      },
      {
        id: 4,
        text: "What does the 'contrast ratio' measure in visual design accessibility guidelines?",
        options: ["The distance between multiple text headers", "The ratio of image width to height", "The difference in perceived luminance (brightness) between foreground text and its background color", "The scaling factor of images across screen widths"],
        answer: 2
      },
      {
        id: 5,
        text: "What is the primary purpose of building a 'prototype'?",
        options: ["To run automated testing in parallel builds", "To write production code directly", "To test, demonstrate, and validate user flows and interactions before investing in full-scale development", "To publish the website to production hosting"],
        answer: 2
      }
    ]
  }
};

// ==========================================
// 1. GET ALL EXAMS LIST
// ==========================================
router.get("/", auth, async (req, res) => {
  try {
    const list = Object.values(exams).map(exam => ({
      id: exam.id,
      name: exam.name,
      description: exam.description,
      questionsCount: exam.questions.length
    }));

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const enrichedList = list.map(item => {
      const cert = user.certifications ? user.certifications.find(c => c.skill.toLowerCase() === item.name.toLowerCase() || c.skill.toLowerCase() === item.id.toLowerCase()) : null;
      return {
        ...item,
        certified: !!cert,
        score: cert ? cert.score : null,
        passedAt: cert ? cert.passedAt : null
      };
    });

    res.json(enrichedList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==========================================
// 2. GET EXAM QUESTIONS (WITHOUT CORRECT ANSWERS)
// ==========================================
router.get("/:examId", auth, async (req, res) => {
  try {
    const exam = exams[req.params.examId.toLowerCase()];
    if (!exam) {
      return res.status(404).json({ msg: "Exam not found" });
    }

    const safeQuestions = exam.questions.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options
    }));

    res.json({
      id: exam.id,
      name: exam.name,
      description: exam.description,
      questions: safeQuestions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==========================================
// 3. SUBMIT EXAM ANSWERS & EVALUATE
// ==========================================
router.post("/:examId/submit", auth, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers) {
      return res.status(400).json({ msg: "No answers provided" });
    }

    const exam = exams[req.params.examId.toLowerCase()];
    if (!exam) {
      return res.status(404).json({ msg: "Exam not found" });
    }

    let correctCount = 0;
    const totalQuestions = exam.questions.length;

    exam.questions.forEach(q => {
      const submittedAnswerIndex = answers[q.id.toString()];
      if (submittedAnswerIndex !== undefined && Number(submittedAnswerIndex) === q.answer) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercent >= 80;

    if (passed) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ msg: "User not found" });

      const skillName = exam.name; 

      if (!user.verifiedSkills) user.verifiedSkills = [];
      if (!user.certifications) user.certifications = [];

      const existingCertIndex = user.certifications.findIndex(
        c => c.skill.toLowerCase() === skillName.toLowerCase()
      );

      if (existingCertIndex >= 0) {
        if (scorePercent > user.certifications[existingCertIndex].score) {
          user.certifications[existingCertIndex].score = scorePercent;
          user.certifications[existingCertIndex].passedAt = new Date();
        }
      } else {
        user.certifications.push({
          skill: skillName,
          score: scorePercent,
          passedAt: new Date()
        });
      }

      if (!user.verifiedSkills.some(s => s.toLowerCase() === skillName.toLowerCase())) {
        user.verifiedSkills.push(skillName);
      }

      if (!user.skills.some(s => s.toLowerCase() === skillName.toLowerCase())) {
        user.skills.push(skillName);
      }

      await user.save();
    }

    res.json({
      passed,
      score: scorePercent,
      correctCount,
      totalQuestions
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
