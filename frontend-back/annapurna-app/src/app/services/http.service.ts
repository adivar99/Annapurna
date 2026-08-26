import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { UtilitiesService } from './utilities.service';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  constructor(
    private http: HttpClient,
    private utils: UtilitiesService,
  ) { }

  processUrl(request_url: string, params: any = null, external: boolean = false) {
    if(params != null) {
      let sparams = this.utils.json_parameters_to_query(params)
      request_url = request_url + '?' + sparams
    }
    return external? request_url: 'api/v1' + request_url
  }

  getData(request_url: string, parameters: any|null = null, external: boolean = false) {
    console.log(parameters)
    request_url = this.processUrl(request_url, parameters, external);
    return this.http.get(request_url)
  }

  postData(request_url: string, body: any, external: boolean = false) {
    request_url = this.processUrl(request_url, null, external)
    return this.http.post(request_url, body)
  }

  deleteData(request_url: string, external: boolean = false) {
    request_url = this.processUrl(request_url, null, external)
    return this.http.delete(request_url)
  }
}
