using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Reflection;
[assembly: AssemblyTitle("KR2MELO Offline — Boletos do histórico")]
[assembly: AssemblyVersion("5.3.46.0")]
[assembly: AssemblyFileVersion("5.3.46.0")]
class Iniciador {
 static readonly string Folder=AppDomain.CurrentDomain.BaseDirectory;
 static string Identity(){using(var hash=SHA256.Create()){
  string text=Folder+"KR2MELO-launcher-5.3.46";
  foreach(var name in new[]{"index.html","offline-start.js","backup-validator.js","history-bills.js","dashboard.js","reading-average.js","mobile.js","app.js","sync.js","financial.js","auditor.js"})text+=File.ReadAllText(Path.Combine(Folder,name));
  return "KR2MELO-5.3.46:"+Convert.ToBase64String(hash.ComputeHash(Encoding.UTF8.GetBytes(text)));
 }}
 static string Read(int port){var req=(HttpWebRequest)WebRequest.Create("http://127.0.0.1:"+port+"/__kr2health");req.Proxy=null;req.Timeout=500;req.ReadWriteTimeout=500;
  using(var response=req.GetResponse())using(var reader=new StreamReader(response.GetResponseStream()))return reader.ReadToEnd();}
 static void Respond(NetworkStream stream,int code,string type,byte[] body,bool head){
  string status=code==200?"OK":code==404?"Not Found":code==405?"Method Not Allowed":"Bad Request";
  byte[] header=Encoding.ASCII.GetBytes("HTTP/1.1 "+code+" "+status+"\r\nContent-Type: "+type+"\r\nContent-Length: "+body.Length+"\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n");
  stream.Write(header,0,header.Length);if(!head)stream.Write(body,0,body.Length);
 }
 static void Handle(TcpClient client,string identity){using(client)try{
  client.ReceiveTimeout=3000;client.SendTimeout=3000;
  using(var stream=client.GetStream()){
   var header=new StringBuilder();int ch;
   while(header.Length<16384&&(ch=stream.ReadByte())>=0){header.Append((char)ch);if(header.ToString().EndsWith("\r\n\r\n"))break;}
   string[] request=header.ToString().Split(new[]{"\r\n"},StringSplitOptions.None)[0].Split(' ');
   if(request.Length!=3||header.Length>=16384){Respond(stream,400,"text/plain",new byte[0],false);return;}
   bool head=request[0]=="HEAD";
   if(request[0]!="GET"&&!head){Respond(stream,405,"text/plain",new byte[0],false);return;}
   string path=Uri.UnescapeDataString(request[1].Split('?')[0]);
   if(path=="/__kr2health"){Respond(stream,200,"text/plain",Encoding.UTF8.GetBytes(identity),head);return;}
   if(path=="/")path="/index.html";
   string full=Path.GetFullPath(Path.Combine(Folder,path.TrimStart('/').Replace('/',Path.DirectorySeparatorChar)));
   string ext=Path.GetExtension(full).ToLowerInvariant();
   string type=ext==".html"?"text/html; charset=utf-8":ext==".js"?"text/javascript; charset=utf-8":ext==".css"?"text/css; charset=utf-8":ext==".png"?"image/png":ext==".csv"?"text/csv; charset=utf-8":ext==".xlsx"?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":ext==".webmanifest"?"application/manifest+json":"";
   if(!full.StartsWith(Folder,StringComparison.OrdinalIgnoreCase)||type==""||!File.Exists(full)){Respond(stream,404,"text/plain",new byte[0],head);return;}
   Respond(stream,200,type,File.ReadAllBytes(full),head);
  }
 }catch{}}
 static int Serve(int port){var server=new TcpListener(IPAddress.Loopback,port);try{
  string identity=Identity();server.Start();while(true){var client=server.AcceptTcpClient();ThreadPool.QueueUserWorkItem(_=>Handle(client,identity));}
 }catch{return 1;}finally{server.Stop();}}
 [STAThread]static int Main(string[] args){try{
  foreach(var name in new[]{"index.html","offline-start.js","backup-validator.js","history-bills.js","dashboard.js","reading-average.js","mobile.js","app.js","sync.js","financial.js","auditor.js","styles.css"})if(!File.Exists(Path.Combine(Folder,name)))throw new Exception("Extraia todo o ZIP. Arquivo ausente: "+name);
  if(args.Length==2&&args[0]=="--serve-only")return Serve(int.Parse(args[1]));
  if(args.Length==1&&args[0]=="--self-test"){Identity();return 0;}
  string identity=Identity();int chosen=0;Process ownedServer=null;
  for(int port=38428;port<=38448;port++){
   try{if(Read(port)==identity){chosen=port;break;}else continue;}catch{}
   var probe=new TcpListener(IPAddress.Loopback,port);try{probe.Start();}catch{continue;}finally{probe.Stop();}
   var process=Process.Start(new ProcessStartInfo(Application.ExecutablePath,"--serve-only "+port){WorkingDirectory=Folder,UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden});
   for(int i=0;i<30;i++){Thread.Sleep(100);try{if(Read(port)==identity){chosen=port;break;}}catch{}if(process.HasExited)break;}
   if(chosen!=0){ownedServer=process;break;}
   if(!process.HasExited){process.Kill();process.WaitForExit();}
  }
  if(chosen==0)throw new Exception("Não foi possível iniciar o servidor local. As portas 38428 a 38448 estão ocupadas ou bloqueadas pelo Windows.");
  if(args.Length==1&&args[0]=="--check-start"){if(ownedServer!=null&&!ownedServer.HasExited){ownedServer.Kill();ownedServer.WaitForExit();}return chosen;}
  Process.Start(new ProcessStartInfo("http://127.0.0.1:"+chosen+"/index.html?session="+Guid.NewGuid().ToString("N")){UseShellExecute=true});return 0;
 }catch(Exception error){if(args.Length==0)MessageBox.Show(error.Message,"KR2MELO · Inicialização",MessageBoxButtons.OK,MessageBoxIcon.Warning);return 1;}}
}
