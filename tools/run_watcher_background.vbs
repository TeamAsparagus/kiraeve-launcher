Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
pyScript = scriptDir & "\uvcs_auto_pipeline.py"
cmd = "python """ & pyScript & """ --watch --interval 30"
WshShell.Run cmd, 0, False
