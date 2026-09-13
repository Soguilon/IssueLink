/**
 * IssueLink — Optional Google Apps Script Bridge
 * Deploy as a Web App (Execute as: Me, Access: Anyone) and paste the
 * resulting /exec URL into Admin → Settings → Data & Sync.
 * This bridge is OPTIONAL. IssueLink works fully offline with localStorage
 * without deploying this script at all.
 */

const SHEET_NAMES = {
  admins: 'Admins', reports: 'Reports', issues: 'Issues', updates: 'IssueUpdates',
  confirmations: 'Confirmations', categories: 'Categories', departments: 'Departments', settings: 'SystemSettings'
};
const PHOTO_FOLDER_NAME = 'IssueLink Evidence Photos';

function doGet(e){
  const action = e.parameter.action;
  if(action === 'ping') return jsonOut({ok:true, message:'IssueLink bridge is online.'});
  if(action === 'getAll') return jsonOut(getAllData());
  return jsonOut({ok:false, error:'Unknown GET action.'});
}

function doPost(e){
  try{
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;
    switch(action){
      case 'authenticate': result = authenticate(body.email, body.password); break;
      case 'saveReport': result = saveReport(body.report); break;
      case 'uploadPhoto': result = uploadPhotoToDrive(body.base64, body.filename, body.mimeType); break;
      case 'saveIssue': result = upsertRow(SHEET_NAMES.issues, 'IssueID', body.issue); break;
      case 'linkReport': result = linkReport(body.reportId, body.issueId); break;
      case 'updateStatus': result = addIssueUpdate(body.update); break;
      case 'saveConfirmation': result = upsertRow(SHEET_NAMES.confirmations, 'ConfirmationID', body.confirmation); break;
      case 'saveCategory': result = upsertRow(SHEET_NAMES.categories, 'CategoryID', body.category); break;
      case 'saveDepartment': result = upsertRow(SHEET_NAMES.departments, 'DepartmentID', body.department); break;
      case 'saveSettings': result = upsertRow(SHEET_NAMES.settings, 'Key', body.settings); break;
      case 'syncAll': result = syncAllData(body); break;
      default: result = {ok:false, error:'Unknown POST action.'};
    }
    return jsonOut(result);
  }catch(err){
    return jsonOut({ok:false, error:String(err)});
  }
}


function syncAllData(body){
  initializeSpreadsheet();
  const lists = [
    ['reports','Reports','ReportID'],
    ['issues','Issues','IssueID'],
    ['updates','IssueUpdates','UpdateID'],
    ['confirmations','Confirmations','ConfirmationID'],
    ['categories','Categories','CategoryID'],
    ['departments','Departments','DepartmentID'],
    ['admins','Admins','AdminID']
  ];
  lists.forEach(item=>{
    const key=item[0], sheet=item[1], idField=item[2];
    const rows = Array.isArray(body[key]) ? body[key] : [];
    rows.forEach(obj=>{
      // Local-only data URLs are accepted and moved to Drive during sync.
      if(key==='reports' && Array.isArray(obj.PhotoURLs) && obj.PhotoURLs.length){
        const urls=[];
        obj.PhotoURLs.forEach((photo, index)=>{
          if(typeof photo==='string' && photo.indexOf('data:image/')===0){
            const uploaded = uploadPhotoToDrive(photo, (obj.ReportCode||obj.ReportID||'report')+'_'+(index+1)+'.jpg', photo.match(/^data:([^;]+)/)?.[1] || 'image/jpeg');
            if(uploaded.ok) urls.push(uploaded.url);
          }else if(photo) urls.push(photo);
        });
        obj = Object.assign({}, obj, {PhotoURLs:urls});
      }
      upsertRow(sheet, idField, obj);
    });
  });
  const data=getAllData();
  data.admins=sheetToObjects(SHEET_NAMES.admins).map(a=>{ const x=Object.assign({},a); delete x.Password; return x; });
  return data;
}

function getSS(){ return SpreadsheetApp.getActiveSpreadsheet(); }

function getSheet(name){
  const ss = getSS();
  let sheet = ss.getSheetByName(name);
  if(!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function initializeSpreadsheet(){
  const schemas = {
    Admins: ['AdminID','Name','Email','Password','Role','Department','Status','CreatedAt','LastLogin'],
    Reports: ['ReportID','ReportCode','IssueID','Category','Title','Description','Latitude','Longitude','LocationText','Severity','PhotoURLs','SubmittedAt','Status','AnonymousReporterID'],
    Issues: ['IssueID','Category','Title','Description','Latitude','Longitude','LocationText','PriorityScore','PriorityLevel','LinkedReportCount','AffectedCount','Status','AssignedDepartment','AssignedStaff','CreatedAt','UpdatedAt','ResolvedAt','ReopenedAt','IsRecurring'],
    IssueUpdates: ['UpdateID','IssueID','Status','Message','UpdatedBy','UpdatedAt','Internal'],
    Confirmations: ['ConfirmationID','IssueID','ReportID','Response','SubmittedAt','AnonymousResidentID'],
    Categories: ['CategoryID','CategoryName','Description','Active'],
    Departments: ['DepartmentID','DepartmentName','Description','Active'],
    SystemSettings: ['Key','Value']
  };
  Object.keys(schemas).forEach(name=>{
    const sheet = getSheet(name);
    if(sheet.getLastRow() === 0) sheet.appendRow(schemas[name]);
  });
}

function sheetToObjects(name){
  const sheet = getSheet(name);
  const values = sheet.getDataRange().getValues();
  if(values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row=>{
    const obj = {};
    headers.forEach((h,i)=> obj[h]=row[i]);
    return obj;
  });
}

function getAllData(){
  initializeSpreadsheet();
  return {
    ok:true,
    reports: sheetToObjects(SHEET_NAMES.reports),
    issues: sheetToObjects(SHEET_NAMES.issues),
    updates: sheetToObjects(SHEET_NAMES.updates),
    confirmations: sheetToObjects(SHEET_NAMES.confirmations),
    categories: sheetToObjects(SHEET_NAMES.categories),
    departments: sheetToObjects(SHEET_NAMES.departments)
  };
}

function upsertRow(sheetName, idField, obj){
  initializeSpreadsheet();
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf(idField);
  let rowIndex = -1;
  for(let r=1;r<values.length;r++){ if(values[r][idCol] === obj[idField]){ rowIndex = r+1; break; } }
  const rowData = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  if(rowIndex === -1) sheet.appendRow(rowData);
  else sheet.getRange(rowIndex,1,1,headers.length).setValues([rowData]);
  return {ok:true};
}

function authenticate(email, password){
  const admins = sheetToObjects(SHEET_NAMES.admins);
  const admin = admins.find(a => a.Email && a.Email.toLowerCase() === (email||'').toLowerCase() && a.Password === password);
  if(!admin) return {ok:false, error:'Invalid credentials.'};
  delete admin.Password;
  return {ok:true, admin:admin};
}

function saveReport(report){
  const result = upsertRow(SHEET_NAMES.reports, 'ReportID', report);
  return result;
}

function linkReport(reportId, issueId){
  const sheet = getSheet(SHEET_NAMES.reports);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('ReportID');
  const issueCol = headers.indexOf('IssueID');
  for(let r=1;r<values.length;r++){
    if(values[r][idCol] === reportId){ sheet.getRange(r+1, issueCol+1).setValue(issueId); return {ok:true}; }
  }
  return {ok:false, error:'Report not found.'};
}

function addIssueUpdate(update){
  return upsertRow(SHEET_NAMES.updates, 'UpdateID', update);
}

function uploadPhotoToDrive(base64, filename, mimeType){
  try{
    const folders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(PHOTO_FOLDER_NAME);
    const bytes = Utilities.base64Decode(base64.split(',').pop());
    const blob = Utilities.newBlob(bytes, mimeType || 'image/jpeg', filename || ('evidence_'+Date.now()+'.jpg'));
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return {ok:true, url: 'https://drive.google.com/uc?id=' + file.getId()};
  }catch(err){
    return {ok:false, error:String(err)};
  }
}

function jsonOut(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
