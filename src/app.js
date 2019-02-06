const { writeFile, readFileSync } = require("fs");
const RequestHandler = require("./frameWork.js");
const {
  TASKS_DETAILS_FILE,
  LISTS_DETAILS_FILE,
  REDIRECTION_CODE
} = require("./constants.js");

const { templates } = require("./template");
const app = new RequestHandler();
const { logRequests, serveFile, readBody } = require("./handler");
const { send } = require("./handlersUtility.js");
const Task = require("./task.js");
const ToDo = require("./todo.js");
const User = require("./user");
const { toString, getUserIdByCookie, getFirstElement } = require("./util.js");
const usersDetails = JSON.parse(readFileSync(LISTS_DETAILS_FILE, "utf8"));

const writer = function(FILE_PATH, CONTENTS) {
  writeFile(FILE_PATH, CONTENTS, err => {
    if (err) throw err;
  });
};

const parseUserDetails = userId => {
  const currentUser = User.parse(usersDetails[userId]);
  usersDetails[userId] = currentUser;
  return;
};

const extractToDoDetails = function(userIdSource, listIdSource) {
  const userId = getUserIdByCookie(userIdSource);
  const listId = extractListId(listIdSource);
  return { userId, listId };
};

const parseUserInput = function(userInput) {
  const args = {};
  const splittedDetails = userInput.split("&");
  const mappedDetails = splittedDetails.map(details => details.split("="));
  mappedDetails.map(keyValuePair => {
    args[keyValuePair[0]] = keyValuePair[1];
  });
  return args;
};

const isDetailsMatching = function(userDetails) {
  const userName = userDetails.username;
  const password = userDetails.password;
  return (userName == "rahulma") & (password == 1234);
};

const validateUser = function(req, res, next) {
  const userDetails = parseUserInput(req.body);
  const userId = userDetails.username;
  if (isDetailsMatching(userDetails)) {
    parseUserDetails(userId);
    res.writeHead(REDIRECTION_CODE, {
      Location: "/Dashboard.html",
      "Set-Cookie": "userId=rahulma"
    });

    next();
    return;
  }
  res.setHeader("Location", "/");
  send(res, "Wrong username and password");
};

const createRow = function(toDoTitle, listId, toDoDescription) {
  return `<a href="/viewTasks.html?listId=${listId}"><div id='${toDoTitle}'
 class='printList'>${toDoDescription}</div><p>${toDoTitle}</p></a>`;
};

const createTable = function(allToDos) {
  let html = "";
  allToDos.map(toDo => {
    html += createRow(toDo.title, toDo.id, toDo.description);
  });
  return html;
};

const viewList = function(req, res) {
  const userId = getUserIdByCookie(req.headers.cookie);
  const currentUser = usersDetails[userId];
  let table = createTable(currentUser.toDos);
  send(res, table);
};

const generateNumericCode = function() {
  const randomNumber = Math.random() * 10000000;
  return Math.floor(randomNumber);
};

const generateId = function(entity) {
  const idPrefix = "w_t_d-";
  const numberCode = generateNumericCode();
  const suffix = entity.slice(0, 1);
  return idPrefix + numberCode + suffix;
};

const getList = function(listItem) {
  const { title, description } = parseUserInput(listItem);
  const toDoId = generateId("TD");
  return new ToDo(title, description, toDoId);
};

const addNewList = function(req, res, next) {
  const userId = getUserIdByCookie(req.headers.cookie);
  const list = getList(req.body);
  const existingTodos = usersDetails[userId].toDos; // think for a good name
  existingTodos.push(list);
  writer(LISTS_DETAILS_FILE, toString(usersDetails));
  next();
};

const extractListId = function(url) {
  return url.split("=")[1];
};

const giveStatus = function(statusBoolean) {
  if (statusBoolean === 0) {
    return "UnDone";
  }
  return "Done";
};

const createTaskRow = function(description, statusBoolean, taskId) {
  let status = giveStatus(statusBoolean);
  return `<tr id="${taskId}" onclick=editTask('${taskId}')><td >${description}</td><td>${status}</td></tr>`;
};

const parseTasks = function(requiredList) {
  let html = '<table class = "taskList">';
  requiredList.map(task => {
    html += createTaskRow(task.description, task.status, task.id);
  });

  return html;
};

const extractFirstElement = function(record) {
  return record[0];
};
const getRequestedEntity = function(entityList, requestedEntityId) {
  const requestedEntity = entityList.filter(
    toDo => toDo.id == requestedEntityId
  );
  return extractFirstElement(requestedEntity);
};

const getTasks = function(req, res) {
  const { userId, listId } = extractToDoDetails(req.headers.cookie, req.url);
  const contents = getRequestedEntity(usersDetails[userId].toDos, listId);
  const html = parseTasks(contents.tasks);
  const form = templates.viewTask + templates.taskEditingForm;
  send(res, form + html);
};

const renderNewTaskForm = function(req, res, next) {
  const form = templates.newTaskForm;
  send(res, form);
};

const renderConfirmDeletionForm = function(req, res) {
  const listId = extractListId(req.headers.referer);
  const form = templates.confirmDeletion(listId);
  send(res, form);
};

const updateTaskList = function(userId, listId, taskDescription) {
  // const currentToDo = getRequestedEntity(usersDetails[userId].toDos, listId);
  const taskId = generateId("task");
  userDetails[userId].addToDoItem(listId,)
  // const newTaskItem = usersDetails[userId];
  // console.log("nya banda", newTaskItem);
  const newTaskItem = new Task(taskDescription, 0, taskId);
  currentToDo.tasks.unshift(newTaskItem);
  writer(LISTS_DETAILS_FILE, toString(usersDetails));
};

const addTaskInList = function(req, res, next) {
  const { userId, listId } = extractToDoDetails(
    req.headers.cookie,
    req.headers.referer
  );
  const task = req.body.split("=")[1];

  updateTaskList(userId, listId, task);
  res.writeHead(REDIRECTION_CODE, {
    location: req.headers.referer
  });
  res.end();
};

const deleteList = function(req, res) {
  const { userId, listId } = extractToDoDetails(
    req.headers.cookie,
    req.headers.referer
  );
  const currentUserToDos = usersDetails[userId].toDos;
  const remainingToDos = currentUserToDos.filter(list => list.id != listId);
  usersDetails[userId].toDos = remainingToDos;
  writer(LISTS_DETAILS_FILE, toString(usersDetails));
  res.writeHead(REDIRECTION_CODE, {
    location: "/dashboard.html"
  });
  res.end();
};

const formatContent = function(req, res, next) {
  const content = decodeURIComponent(req.body);
  req.body = content.replace(/\+/g, " ");
  next();
};

const redirectTo = function(res, url) {
  res.writeHead(REDIRECTION_CODE, {
    Location: url
  });
  return;
};

const editTaskDescription = function(req, res) {
  const { userId, listId } = extractToDoDetails(
    req.headers.cookie,
    req.headers.referer
  );
  const editedTaskDetails = parseUserInput(req.body);
  const { taskDescription, taskId } = editedTaskDetails;
  const parsedUsersToDos = usersDetails[userId].toDos.map(toDo =>
    ToDo.parse(toDo)
  );
  usersDetails[userId].toDos = parsedUsersToDos;
  const requestedToDo = getRequestedEntity(usersDetails[userId].toDos, listId);
  const requestedTask = getRequestedEntity(requestedToDo.tasks, taskId);
  requestedTask.editDescription(taskDescription);
  redirectTo(res, req.headers.referer);
  writer(TASKS_DETAILS_FILE, toString(usersDetails));
  res.end();
};
app.use(readBody);
app.use(formatContent);
app.use(logRequests);

app.post("/login", validateUser);

app.post("/dashboard.html", addNewList);
app.get("/viewList", viewList);
app.get("/confirmDeletion", renderConfirmDeletionForm);
app.post(/\/deleteList\?listId=/, deleteList);

app.get(/\/viewTasks.html\?listId=/, getTasks);
app.get("/newTaskForm", renderNewTaskForm);
app.post("/addNewTask", addTaskInList);
app.post("/editTask", editTaskDescription);

app.use(serveFile);

module.exports = app.handleRequest.bind(app);
