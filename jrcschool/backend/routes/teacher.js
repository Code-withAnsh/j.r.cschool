/**
 * Teacher routes - student registration etc.
 * Mounted at /api/teacher
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Student = require('../models/Student');

const isDbConnected = () => mongoose.connection.readyState === 1;
const CLASSES = [
  'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8',
  '9', '9-Arts', '9-Home Science', '9-Science',
  '10',
  '11-Arts', '11-Commerce', '11-Science',
  '12-Arts', '12-Commerce', '12-Science'
];

// POST /api/teacher/register-student - teacher registers student (name, class, rollNo)
router.post('/register-student', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'डेटाबेस कनेक्ट नहीं है।' });
    }
    const { name, class: cls, rollNo } = req.body;
    if (!name || !cls || !rollNo) {
      return res.status(400).json({ success: false, message: 'नाम, कक्षा और रोल नंबर जरूरी हैं।' });
    }
    const nameTrim = String(name).trim();
    const classTrim = String(cls).trim();
    const rollTrim = String(rollNo).trim();
    if (!CLASSES.includes(classTrim)) {
      return res.status(400).json({ success: false, message: 'अमान्य कक्षा।' });
    }
    const existing = await Student.findOne({ class: classTrim, rollNo: rollTrim });
    if (existing) {
      return res.status(400).json({ success: false, message: 'इस कक्षा में यह रोल नंबर पहले से रजिस्टर है।' });
    }
    const student = new Student({ name: nameTrim, class: classTrim, rollNo: rollTrim });
    await student.save();
    return res.status(201).json({
      success: true,
      message: 'छात्र रजिस्टर हो गया। अब छात्र पोर्टल से खाता बना सकता है।',
      data: { id: student._id, name: student.name, class: student.class, rollNo: student.rollNo }
    });
  } catch (err) {
    console.error('Teacher register student error:', err);
    res.status(500).json({ success: false, message: 'रजिस्ट्रेशन में त्रुटि।' });
  }
});

// DELETE /api/teacher/delete-student/:id - delete student (if admission cancelled)
router.delete('/delete-student/:id', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'डेटाबेस कनेक्ट नहीं है।' });
    }
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'छात्र नहीं मिला।' });
    }
    // Also delete related results and fees (optional - you can keep them for records)
    const StudentResult = require('../models/StudentResult');
    const StudentFee = require('../models/StudentFee');
    await StudentResult.deleteMany({ student: req.params.id });
    await StudentFee.deleteMany({ student: req.params.id });
    return res.json({
      success: true,
      message: 'छात्र और उसके सभी रिकॉर्ड हटा दिए गए हैं।'
    });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ success: false, message: 'हटाने में त्रुटि।' });
  }
});

// POST /api/teacher/reset-password - reset student password (if forgotten)
router.post('/reset-password', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'डेटाबेस कनेक्ट नहीं है।' });
    }
    const { studentId, newPassword } = req.body;
    if (!studentId || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'छात्र ID और नया पासवर्ड (कम से कम 6 अक्षर) जरूरी है।' });
    }
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'छात्र नहीं मिला।' });
    }
    student.setPassword(newPassword);
    await student.save();
    return res.json({
      success: true,
      message: 'पासवर्ड बदल दिया गया है।'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'पासवर्ड बदलने में त्रुटि।' });
  }
});

module.exports = router;
