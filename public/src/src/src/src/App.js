import React,{useState,useEffect} from "react";
import {motion} from "framer-motion";
import {
LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid,ResponsiveContainer
} from "recharts";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import * as XLSX from "xlsx";
import {saveAs} from "file-saver";

import {
FaChartLine,
FaUsers,
FaFileDownload,
FaUserGraduate,
FaSignOutAlt
} from "react-icons/fa";

import {db} from "./firebase";
import {
collection,
addDoc,
getDocs,
updateDoc,
doc
} from "firebase/firestore";

const subjects=[
"Mathematics",
"English",
"Kiswahili",
"Science",
"Agriculture",
"Social Studies",
"Pretechnical Studies",
"Creative Arts",
"Religious Studies"
];

const grades=["7","8","9"];

const terms=["Term 1","Term 2","Term 3"];

const sidebar={
width:230,
background:"#000",
color:"white",
padding:20,
height:"100vh",
position:"fixed"
};

const main={
marginLeft:250,
padding:30,
minHeight:"100vh",
background:"linear-gradient(135deg,#87CEEB,#001f3f)",
color:"white",
fontFamily:"Segoe UI"
};

function getGrade(mark){

if(mark>=81) return "EE";
if(mark>=61) return "ME";
if(mark>=41) return "AE";
return "BE";

}

export default function App(){

const [page,setPage]=useState("login");

const [email,setEmail]=useState("");
const [password,setPassword]=useState("");
const [confirm,setConfirm]=useState("");

const [teacher,setTeacher]=useState("");
const [teacherName,setTeacherName]=useState("");

const [learners,setLearners]=useState([]);

const [name,setName]=useState("");
const [grade,setGrade]=useState("7");

const [term,setTerm]=useState("Term 1");

const [selected,setSelected]=useState("");

useEffect(()=>{
loadLearners();
},[]);

async function loadLearners(){

const querySnapshot=await getDocs(collection(db,"learners"));

let data=[];

querySnapshot.forEach((d)=>{
data.push({...d.data(),id:d.id});
});

setLearners(data);

}

function createAccount(){

if(password!==confirm){

alert("Passwords do not match");
return;

}

localStorage.setItem("teacherLogin",JSON.stringify({email,password}));

alert("Account created");

setPage("login");

}

function login(){

const saved=JSON.parse(localStorage.getItem("teacherLogin"));

if(saved && saved.email===email && saved.password===password){

setTeacher(email);

setPage("dashboard");

}else{

alert("Wrong login details");

}

}

function logout(){

setTeacher("");
setPage("login");

}

async function addLearner(){

if(!name) return;

const newLearner={
name,
grade,
records:{
"Term 1":{},
"Term 2":{},
"Term 3":{}
}
};

const docRef=await addDoc(collection(db,"learners"),newLearner);

setLearners([...learners,{...newLearner,id:docRef.id}]);

setName("");

}

async function updateMark(student,subject,value){

const learner=learners.find(l=>l.name===student);

if(!learner) return;

const updatedRecords={
...learner.records,
[term]:{
...learner.records[term],
[subject]:Number(value)
}
};

await updateDoc(doc(db,"learners",learner.id),{
records:updatedRecords
});

setLearners(prev=>prev.map(l=>{
if(l.name!==student) return l;
return {...l,records:updatedRecords};
}));

}

function avg(l){

let total=0;
let count=0;

subjects.forEach(s=>{

const mark=l.records[term]?.[s];

if(mark!==undefined){

total+=mark;
count++;

}

});

return count?Math.round(total/count):0;

}

function ranked(){

let arr=learners.map(l=>({...l,avg:avg(l)}));

arr.sort((a,b)=>b.avg-a.avg);

return arr.map((l,i)=>({...l,rank:i+1}));

}

const subjectData=subjects.map(s=>{

let total=0;
let count=0;

learners.forEach(l=>{

const mark=l.records[term]?.[s];

if(mark!==undefined){

total+=mark;
count++;

}

});

return{
subject:s,
avg:count?Math.round(total/count):0
};

});

const learnerData=selected?subjects.map(s=>({

subject:s,
mark:learners.find(l=>l.name===selected)?.records[term]?.[s]||0

})):[ ];

function exportExcel(){

const data=ranked().map(l=>{

let row={
Name:l.name,
Grade:l.grade,
Average:l.avg,
Rank:l.rank
};

subjects.forEach(s=>{
row[s]=l.records[term]?.[s]||"";
});

return row;

});

const worksheet=XLSX.utils.json_to_sheet(data);

const workbook=XLSX.utils.book_new();

XLSX.utils.book_append_sheet(workbook,worksheet,"Marklist");

const excelBuffer=XLSX.write(workbook,{bookType:"xlsx",type:"array"});

const blob=new Blob([excelBuffer],{type:"application/octet-stream"});

saveAs(blob,"Marklist.xlsx");

}

function reportCard(l){

const doc=new jsPDF();

doc.setFontSize(18);
doc.text("COMPETENCY BASED EDUCATION REPORT",40,20);

doc.setFontSize(12);

doc.text("Learner: "+l.name,20,40);
doc.text("Grade: "+l.grade,20,50);
doc.text("Teacher: "+teacherName,20,60);
doc.text("Term: "+term,20,70);

const rows=subjects.map(s=>[
s,
l.records[term]?.[s]||"",
getGrade(l.records[term]?.[s]||0)
]);

autoTable(doc,{
startY:80,
head:[["Subject","Marks","Grade"]],
body:rows
});

doc.save(l.name+"_report.pdf");

}

if(page==="login") return(

<div style={main}>

<h1>LEONMUD CBE Tracker</h1>

<input
placeholder="Email"
onChange={e=>setEmail(e.target.value)}
/>

<br/>

<input
type="password"
placeholder="Password"
onChange={e=>setPassword(e.target.value)}
/>

<br/>

<button onClick={login}>Login</button>

<button onClick={()=>setPage("create")}>
Create Account
</button>

</div>

);

if(page==="create") return(

<div style={main}>

<h2>Create Teacher Account</h2>

<input
placeholder="Email"
onChange={e=>setEmail(e.target.value)}
/>

<br/>

<input
type="password"
placeholder="Password"
onChange={e=>setPassword(e.target.value)}
/>

<br/>

<input
type="password"
placeholder="Confirm Password"
onChange={e=>setConfirm(e.target.value)}
/>

<br/>

<button onClick={createAccount}>
Create
</button>

</div>

);

return(

<div>

<div style={sidebar}>

<h2>LEONMUD</h2>

<p onClick={()=>setPage("dashboard")}><FaChartLine/> Dashboard</p>

<p onClick={()=>setPage("learners")}><FaUsers/> Learners</p>

<p onClick={()=>setPage("analytics")}><FaChartLine/> Analytics</p>

<p onClick={()=>setPage("reports")}><FaFileDownload/> Reports</p>

<p onClick={()=>setPage("profile")}><FaUserGraduate/> Teacher Profile</p>

<p onClick={logout}><FaSignOutAlt/> Logout</p>

</div>

<div style={main}>

{page==="dashboard" &&(

<div>

<motion.h1
initial={{opacity:0,y:-40}}
animate={{opacity:1,y:0}}
>
Welcome {teacherName || teacher}
</motion.h1>

<h3>Select Term</h3>

<select
value={term}
onChange={e=>setTerm(e.target.value)}
>
{terms.map(t=>
<option key={t}>{t}</option>
)}
</select>

<h3>Top Learners</h3>

<ul>

{ranked().slice(0,5).map(l=>

<li key={l.name}>
{l.rank}. {l.name} ({l.avg})
</li>

)}

</ul>

</div>

)}

{page==="learners" &&(

<div>

<h2>Add Learner</h2>

<input
placeholder="Learner name"
value={name}
onChange={e=>setName(e.target.value)}
/>

<select
value={grade}
onChange={e=>setGrade(e.target.value)}
>
{grades.map(g=>
<option key={g}>{g}</option>
)}
</select>

<button onClick={addLearner}>Add</button>

<table border="1" style={{background:"white",color:"black"}}>

<thead>

<tr>

<th>Name</th>
<th>Grade</th>

{subjects.map(s=>
<th key={s}>{s}</th>
)}

<th>Average</th>
<th>Rank</th>

</tr>

</thead>

<tbody>

{ranked().map(l=>

<tr key={l.name}>

<td>{l.name}</td>
<td>{l.grade}</td>

{subjects.map(s=>

<td key={s}>

<input
type="number"
value={l.records[term]?.[s]||""}
onChange={e=>updateMark(l.name,s,e.target.value)}
style={{width:50}}
/>

</td>

)}

<td>{l.avg}</td>
<td>{l.rank}</td>

</tr>

)}

</tbody>

</table>

</div>

)}

{page==="analytics" &&(

<div>

<h2>Subject Performance</h2>

<ResponsiveContainer width="100%" height={300}>

<LineChart data={subjectData}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="subject"/>

<YAxis/>

<Tooltip/>

<Line dataKey="avg"/>

</LineChart>

</ResponsiveContainer>

<h2>Learner Performance</h2>

<select onChange={e=>setSelected(e.target.value)}>

<option>Select learner</option>

{learners.map(l=>
<option key={l.name}>{l.name}</option>
)}

</select>

{selected &&(

<ResponsiveContainer width="100%" height={300}>

<LineChart data={learnerData}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="subject"/>

<YAxis/>

<Tooltip/>

<Line dataKey="mark"/>

</LineChart>

</ResponsiveContainer>

)}

</div>

)}

{page==="reports" &&(

<div>

<h2>Reports</h2>

<button onClick={exportExcel}>
Export Excel Marklist
</button>

<ul>

{learners.map(l=>

<li key={l.name}>

{l.name}

<button onClick={()=>reportCard(l)}>
PDF
</button>

</li>

)}

</ul>

</div>

)}

{page==="profile" &&(

<div>

<h2>Teacher Profile</h2>

<p>Email: {teacher}</p>

<input
placeholder="Teacher name"
value={teacherName}
onChange={e=>setTeacherName(e.target.value)}
/>

<p>Total learners: {learners.length}</p>

</div>

)}

</div>

</div>

);

}
