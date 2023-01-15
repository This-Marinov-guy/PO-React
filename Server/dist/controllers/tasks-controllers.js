import { validationResult } from "express-validator";
import mongoose from "mongoose";
import HttpError from "../models/Http-error.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
const getTasksByProject = async (req, res, next) => {
    const projectId = req.params.pid;
    let projectWithTasks;
    try {
        projectWithTasks = await Project.findById(projectId).populate("tasks");
    }
    catch (err) {
        return next(new HttpError("Fetching tasks failed", 500));
    }
    if (!projectWithTasks || projectWithTasks.tasks.length === 0) {
        return next(new HttpError("Project has no tasks", 404));
    }
    res.json({
        tasks: projectWithTasks.tasks.map((t) => t.toObject({ getters: true })),
    });
};
const getTasksByUser = async (req, res, next) => {
    const userId = req.params.uid;
    let userWithTasks;
    try {
        userWithTasks = await User.findById(userId).populate({
            path: "projects",
            model: "Project",
            populate: { path: "tasks", model: "Task" },
        });
    }
    catch (err) {
        return next(new HttpError("Fetching tasks failed", 500));
    }
    if (!userWithTasks || userWithTasks.projects.tasks.length === 0) {
        return next(new HttpError("User has no tasks", 404));
    }
    res.json({
        tasks: userWithTasks.projects.tasks.map((t) => t.toObject({ getters: true })),
    });
};
const postAddTask = async (req, res, next) => {
    const { creator, projectId, title, subtasks } = req.body;
    console.log('body', req.body);
    if (!projectId) {
        return next(new HttpError("Please create a project and then assign it tasks", 500));
    }
    const createdTask = new Task({
        creator,
        projectId,
        title,
        subtasks,
    });
    let projectOfTask;
    try {
        projectOfTask = await Project.findById(projectId);
    }
    catch (err) {
        return next(new HttpError("Creating task failed, please try again", 500));
    }
    if (!projectOfTask) {
        return next(new HttpError("Could not find a project with provided id", 404));
    }
    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdTask.save({ session: sess });
        projectOfTask.tasks.push(createdTask);
        await projectOfTask.save({ session: sess });
        await sess.commitTransaction();
    }
    catch (err) {
        return next(new HttpError("Creating task failed, please try again", 500));
    }
    res.status(201).json({ task: createdTask });
};
const postAddSubtask = async (req, res, next) => {
    const { tid, subtasks } = req.body;
    let task;
    try {
        task = await Task.findById(tid);
    }
    catch (err) {
        return next(new HttpError("Creating subtask failed, please try again", 500));
    }
    if (!task) {
        return next(new HttpError("Could not find task", 404));
    }
    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        task.push(subtasks);
        await task.save({ session: sess });
        await sess.commitTransaction();
    }
    catch (err) {
        return next(new HttpError("Adding subtasks failed", 500));
    }
    res.status(201).json({ subtasks: subtasks });
};
const patchUpdateTask = async (req, res, next) => {
    //remove this if you dont have validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError("Invalid inputs", 422));
    }
    const { tid, title, subtasks } = req.body;
    let task;
    try {
        task = await Task.findById(tid);
    }
    catch (err) {
        return next(new HttpError("Something went wrong, please try again", 500));
    }
    task.title = title;
    task.subtasks = subtasks;
    try {
        await task.save();
    }
    catch (err) {
        return next(new HttpError("Something went wrong, please try again", 500));
    }
    res.status(200).json({ task: task.toObject({ getters: true }) });
};
const putUpdateSubtasks = async (req, res, next) => {
    const { taskId, subtasks } = req.body;
    let task;
    try {
        task = await Task.findById(taskId);
    }
    catch (err) {
        return next(new HttpError("Creating subtask failed, please try again", 500));
    }
    task.subtasks = subtasks;
    try {
        await task.save();
    }
    catch (err) {
        return next(new HttpError("Something went wrong", 500));
    }
    res.status(200).json({ subtasks: subtasks.toObject({ getters: true }) });
};
const deleteTask = async (req, res, next) => {
    const taskid = req.params.tid;
    let task;
    try {
        task = await Task.findById(taskid).populate("project");
    }
    catch (err) {
        return next(new HttpError("Something went wrong", 500));
    }
    if (!task) {
        return next(new HttpError("Could not find a task", 404));
    }
    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await task.remove({ session: sess });
        task.project.tasks.pull(task);
        await task.project.save({ session: sess });
        await sess.commitTransaction();
    }
    catch (err) {
        return next(new HttpError("Something went wrong, please try again", 500));
    }
    res.status(200).json({ message: "Task deleted" });
};
export { getTasksByProject, getTasksByUser, postAddTask, postAddSubtask, patchUpdateTask, putUpdateSubtasks, deleteTask, };
//# sourceMappingURL=tasks-controllers.js.map