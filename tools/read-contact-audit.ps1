$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime] > $null
[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime] > $null
[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime] > $null
[Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime] > $null
$asTask=([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await-WinRT($operation,$resultType){$task=$asTask.MakeGenericMethod($resultType).Invoke($null,@($operation));$task.Wait();return $task.Result}
$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('ru'))
$audit=Join-Path $PSScriptRoot '.contact-audit'
$inputs=Get-Content (Join-Path $audit 'inputs.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$results=New-Object System.Collections.Generic.List[object]
$counter=0
foreach($item in $inputs){
 $file=Await-WinRT ([Windows.Storage.StorageFile]::GetFileFromPathAsync($item.file)) ([Windows.Storage.StorageFile])
 $stream=Await-WinRT ($file.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
 $decoder=Await-WinRT ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
 $bitmap=Await-WinRT ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
 $recognized=Await-WinRT ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
 $lines=@(foreach($line in $recognized.Lines){
  $words=@(foreach($word in $line.Words){$r=$word.BoundingRect;@{text=$word.Text;x=$r.X/$item.scale;y=$r.Y/$item.scale+$item.y;w=$r.Width/$item.scale;h=$r.Height/$item.scale}})
  @{text=$line.Text;words=$words}
 })
 $results.Add(@{asset=$item.asset;width=$item.width;height=$item.height;lines=$lines})
 $bitmap.Dispose();$stream.Dispose();$counter++
 if($counter%25 -eq 0){Write-Output "$counter / $($inputs.Count)"}
}
$results | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $audit 'ocr.json') -Encoding UTF8
Write-Output "Done: $counter"
