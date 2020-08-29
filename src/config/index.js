const express = require('express');

const config = app => {
    // some housekeeping config for handling form submission and mark public folder as 'public'
    app.use(express.urlencoded({extended:true}));
    app.use(express.json());
    app.use(express.static('public'));
};

module.exports = config;