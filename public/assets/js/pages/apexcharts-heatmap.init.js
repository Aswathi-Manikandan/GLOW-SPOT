function getChartColorsArray(a){if(null!==document.getElementById(a))return a=document.getElementById(a).getAttribute("data-colors"),(a=JSON.parse(a)).map(function(a){a=a.replace(" ","");return-1==a.indexOf("--")?a:getComputedStyle(document.documentElement).getPropertyValue(a)||void 0})}function generateData(a,e){for(var t=0,r=[];t<a;){var n="w"+(t+1).toString(),m=Math.floor(Math.random()*(e.max-e.min+1))+e.min;r.push({x:n,y:m}),t++}return r}var barchartColors=getChartColorsArray("basic_heatmap"),options={series:[{name:"Metric1",data:generateData(18,{min:0,max:90})},{name:"Metric2",data:generateData(18,{min:0,max:90})},{name:"Metric3",data:generateData(18,{min:0,max:90})},{name:"Metric4",data:generateData(18,{min:0,max:90})},{name:"Metric5",data:generateData(18,{min:0,max:90})},{name:"Metric6",data:generateData(18,{min:0,max:90})},{name:"Metric7",data:generateData(18,{min:0,max:90})},{name:"Metric8",data:generateData(18,{min:0,max:90})},{name:"Metric9",data:generateData(18,{min:0,max:90})}],chart:{height:450,type:"heatmap",toolbar:{show:!1}},dataLabels:{enabled:!1},colors:barchartColors,title:{text:"HeatMap Chart (Single color)",style:{fontWeight:500}}},chart=new ApexCharts(document.querySelector("#basic_heatmap"),options);function generateData(a,e){for(var t=0,r=[];t<a;){var n=(t+1).toString(),m=Math.floor(Math.random()*(e.max-e.min+1))+e.min;r.push({x:n,y:m}),t++}return r}chart.render();var data=[{name:"W1",data:generateData(8,{min:0,max:90})},{name:"W2",data:generateData(8,{min:0,max:90})},{name:"W3",data:generateData(8,{min:0,max:90})},{name:"W4",data:generateData(8,{min:0,max:90})},{name:"W5",data:generateData(8,{min:0,max:90})},{name:"W6",data:generateData(8,{min:0,max:90})},{name:"W7",data:generateData(8,{min:0,max:90})},{name:"W8",data:generateData(8,{min:0,max:90})},{name:"W9",data:generateData(8,{min:0,max:90})},{name:"W10",data:generateData(8,{min:0,max:90})},{name:"W11",data:generateData(8,{min:0,max:90})},{name:"W12",data:generateData(8,{min:0,max:90})},{name:"W13",data:generateData(8,{min:0,max:90})},{name:"W14",data:generateData(8,{min:0,max:90})},{name:"W15",data:generateData(8,{min:0,max:90})}],colors=(data.reverse(),["#f7cc53","#f1734f","#663f59","#6a6e94","#4e88b4","#00a7c6","#18d8d8","#a9d794","#46aF78","#a93f55","#8c5e58","#2176ff","#5fd0f3","#74788d","#51d28c"]),barchartColors=(colors.reverse(),getChartColorsArray("multiple_heatmap")),options={series:data,chart:{height:450,type:"heatmap",toolbar:{show:!1}},dataLabels:{enabled:!1},colors:barchartColors,xaxis:{type:"category",categories:["10:00","10:30","11:00","11:30","12:00","12:30","01:00","01:30"]},title:{text:"HeatMap Chart (Different color shades for each series)",style:{fontWeight:500}},grid:{padding:{right:20}}},barchartColors=((chart=new ApexCharts(document.querySelector("#multiple_heatmap"),options)).render(),getChartColorsArray("color_heatmap")),options={series:[{name:"Jan",data:generateData(20,{min:-30,max:55})},{name:"Feb",data:generateData(20,{min:-30,max:55})},{name:"Mar",data:generateData(20,{min:-30,max:55})},{name:"Apr",data:generateData(20,{min:-30,max:55})},{name:"May",data:generateData(20,{min:-30,max:55})},{name:"Jun",data:generateData(20,{min:-30,max:55})},{name:"Jul",data:generateData(20,{min:-30,max:55})},{name:"Aug",data:generateData(20,{min:-30,max:55})},{name:"Sep",data:generateData(20,{min:-30,max:55})}],chart:{height:350,type:"heatmap",toolbar:{show:!1}},plotOptions:{heatmap:{shadeIntensity:.5,radius:0,useFillColorAsStroke:!0,colorScale:{ranges:[{from:-30,to:5,name:"Low",color:barchartColors[0]},{from:6,to:20,name:"Medium",color:barchartColors[1]},{from:21,to:45,name:"High",color:barchartColors[2]},{from:46,to:55,name:"Extreme",color:barchartColors[3]}]}}},dataLabels:{enabled:!1},stroke:{width:1},title:{text:"HeatMap Chart with Color Range",style:{fontWeight:500}},colors:barchartColors},barchartColors=((chart=new ApexCharts(document.querySelector("#color_heatmap"),options)).render(),getChartColorsArray("shades_heatmap")),options={series:[{name:"Metric1",data:generateData(20,{min:0,max:90})},{name:"Metric2",data:generateData(20,{min:0,max:90})},{name:"Metric3",data:generateData(20,{min:0,max:90})},{name:"Metric4",data:generateData(20,{min:0,max:90})},{name:"Metric5",data:generateData(20,{min:0,max:90})},{name:"Metric6",data:generateData(20,{min:0,max:90})},{name:"Metric7",data:generateData(20,{min:0,max:90})},{name:"Metric8",data:generateData(20,{min:0,max:90})},{name:"Metric8",data:generateData(20,{min:0,max:90})}],chart:{height:350,type:"heatmap",toolbar:{show:!1}},stroke:{width:0},plotOptions:{heatmap:{radius:30,enableShades:!1,colorScale:{ranges:[{from:0,to:50,color:barchartColors[0]},{from:51,to:100,color:barchartColors[1]}]}}},dataLabels:{enabled:!0,style:{colors:["#fff"]}},xaxis:{type:"category"},title:{text:"Rounded (Range without Shades)",style:{fontWeight:500}}};(chart=new ApexCharts(document.querySelector("#shades_heatmap"),options)).render();