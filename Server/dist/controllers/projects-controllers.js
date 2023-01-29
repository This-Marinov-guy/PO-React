import { validationResult } from "express-validator";
import fs from "fs";
import mongoose from "mongoose";
import HttpError from "../models/Http-error.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
const getProjectById = async (req, res, next) => {
    const projectId = req.params.projectId;
    let project;
    try {
        project = await Project.findById(projectId);
    }
    catch (err) {
        return next(new HttpError("Something went wrong, could not find project", 500));
    }
    if (!project) {
        return next(new HttpError("No such project", 404));
    }
    res.json({ project: project.toObject({ getters: true }) });
};
const getProjectByUserId = async (req, res, next) => {
    const userId = req.params.userId;
    let userWithProjects;
    try {
        userWithProjects = await User.findById(userId).populate("projects");
    }
    catch (err) {
        return next(new HttpError("Fetching projects failed, please try again", 500));
    }
    if (!userWithProjects || userWithProjects.projects.length === 0) {
        return next(new HttpError("User has no projects", 404));
    }
    res.json({
        projects: userWithProjects.projects.map((p) => p.toObject({ getters: true })),
    });
};
const postAddProject = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError("Invalid inputs, please check your data", 422));
    }
    const { creator, title, description } = req.body;
    const createdProject = new Project({
        creator,
        status: "active",
        title,
        description,
        image: "http://localhost:5000/" + req.file.path,
        tasks: [],
        workers: [],
    });
    let user;
    try {
        user = await User.findById(creator);
    }
    catch (err) {
        return next(new HttpError("Creating project failed, please try again", 500));
    }
    if (!user) {
        return next(new HttpError("Could not find user for provided id", 404));
    }
    try {
        //adding project to user with session
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdProject.save({ session: sess });
        user.projects.push(createdProject);
        await user.save({ session: sess });
        await sess.commitTransaction();
    }
    catch (err) {
        return next(new HttpError("Creating project failed, please try again", 500));
    }
    res.status(201).json({ projectId: createdProject._id });
};
const postAddWorkers = async (req, res, next) => {
    const { projectId, workers } = req.body;
    if (!projectId) {
        return next(new HttpError("Please create a project and then assign it workers", 500));
    }
    let projectOfTask;
    try {
        projectOfTask = await Project.findById(projectId);
    }
    catch (err) {
        return next(new HttpError("Adding workers failed, please try again", 500));
    }
    if (!projectOfTask) {
        return next(new HttpError("Could not find a project with provided id", 404));
    }
    let listOfWorkers;
    for (let i = 0; i < workers.length; i++) {
        let workerId;
        try {
            workerId = await (await User.findOne({
                name: workers[i].split(" ")[0],
                surname: workers[i].split(" ")[1],
            }))._id;
            listOfWorkers.push(workerId);
        }
        catch (err) {
            return next(new HttpError("Could not find one of the users", 500));
        }
    }
    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        projectOfTask.workers.push(listOfWorkers);
        await projectOfTask.save({ session: sess });
        await sess.commitTransaction();
    }
    catch (err) {
        return next(new HttpError("Adding workers failed, please try again", 500));
    }
    res.status(201).json({ workers: workers });
};
const patchAbortProject = async (req, res, next) => {
    const userId = req.body.userId;
    const projectId = req.params.projectId;
    let currentUser;
    let project;
    try {
        project = await Project.findById(projectId);
        currentUser = await User.findById(userId);
    }
    catch (err) {
        return next(new HttpError("Something went wrong", 500));
    }
    if (!project) {
        return next(new HttpError("Could not find a project with such id", 404));
    }
    if (!currentUser) {
        return next(new HttpError("Could not find you in the database", 404));
    }
    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        currentUser.projects.pull(project);
        project.partcipants.pull(currentUser);
        await currentUser.save();
        await project.save();
        await sess.commitTransaction();
    }
    catch (err) {
        return next(new HttpError("Aborting failed, please try again later", 500));
    }
    res.status(200).json({ message: "Project aborted" });
};
const deleteProject = async (req, res, next) => {
    const projectId = req.params.projectId;
    console.log(projectId);
    let project;
    try {
        project = await Project.findByIdAndDelete(projectId);
    }
    catch (err) {
        return next(new HttpError("Something went wrong", 500));
    }
    if (!project) {
        return next(new HttpError("Could not find a project with such id", 404));
    }
    fs.unlink(project.image, (err) => {
        console.log(err);
    });
    res.status(200).json({ message: "Project deleted" });
};
export { getProjectById, getProjectByUserId, postAddProject, postAddWorkers, patchAbortProject, deleteProject, };
//# sourceMappingURL=projects-controllers.js.map